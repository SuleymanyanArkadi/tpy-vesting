// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Vesting is Ownable {
    using SafeERC20 for IERC20;

    /**
     * @notice The structure is used in the contract createVestingScheduleBatch function for create vesting schedules
     * @param totalAmount the number of tokens to be vested during the vesting duration.
     * @param target the address that will receive tokens according to schedule parameters.
     * @param isStandard is the schedule standard type
     * @param percentsPerStages token percentages for each stage to be vest(% * 100). Empty array if schedule is standard
     * @param stagePeriods schedule stages in minutes(block.timestamp / 60). Empty array if schedule is standard
     */
    struct ScheduleData {
        uint256 totalAmount;
        address target;
        bool isStandard;
        uint16[] percentsPerStages;
        uint32[] stagePeriods;
    }

    /**
     * @notice Standard vesting schedules of an account.
     * @param initialized to check whether such a schedule already exists or not.
     * @param totalAmount the number of tokens to be vested during the vesting duration.
     * @param released the amount of the token released. It means that the account has called withdraw() and received
     * @param activeStage index of the stage starting from which tokens were not withdrawn.
     */
    struct StandardVestingSchedule {
        bool initialized;
        uint256 totalAmount;
        uint256 released;
        uint16 activeStage;
    }

    /**
     * @notice Non standard vesting schedules of an account.
     * @param initialized to check whether such a schedule already exists or not.
     * @param totalAmount the number of tokens to be vested during the vesting duration.
     * @param released the amount of the token released. It means that the account has called withdraw() and received
     * @param activeStage index of the stage starting from which tokens were not withdrawn.
     * @param percentsPerStages token percentages for each stage to be vest(% * 100).
     * @param stagePeriods schedule stages in minutes(block.timestamp / 60).
     */
    struct NonStandardVestingSchedule {
        bool initialized;
        uint256 totalAmount;
        uint256 released;
        uint16 activeStage;
        uint16[] percentsPerStages;
        uint32[] stagePeriods;
    }

    mapping(address => StandardVestingSchedule) public standardSchedules;
    mapping(address => NonStandardVestingSchedule) public nonStandardSchedules;

    IERC20 public token;

    /// @notice token percentages for standard schedules for each stage to be vest. Percent multiplied by 100
    uint16[9] public percentsPerStages = [3000, 750, 750, 750, 750, 1000, 1000, 1000, 1000];
    /// @notice standard schedule stages in minutes. block.timestamp / 60
    uint32[9] public stagePeriods = [28160701, 28293181, 28425661, 28558141, 28690621, 28823101, 28955581, 29088061];

    event VestingScheduleAdded(address target, bool isStandard);
    event Withdrawn(address, uint256 withdrawn);
    event WithdrawnPaused(bool pauseState);

    constructor(IERC20 _token) {
        token = _token;
    }

    /**
     * @notice function to get the amount of tokens available for withdrawal
     * @param target withdrawal schedule target address
     */
    function getClaimableReward(address target) external view returns (uint256 claimableAmount) {
        require(_isScheduleExist(target), "Vesting:: Schedule does not exist");
        uint16 stage;

        if (standardSchedules[target].initialized) {
            StandardVestingSchedule memory schedule = standardSchedules[target];

            for (stage = schedule.activeStage; stage < stagePeriods.length; stage++) {
                if (getTime() >= stagePeriods[stage]) {
                    claimableAmount += (percentsPerStages[stage] * schedule.totalAmount) / 10000;
                } else break;
            }
        } else {
            NonStandardVestingSchedule memory schedule = nonStandardSchedules[target];

            for (stage = schedule.activeStage; stage < schedule.stagePeriods.length; stage++) {
                if (getTime() >= schedule.stagePeriods[stage]) {
                    claimableAmount += (schedule.percentsPerStages[stage] * schedule.totalAmount) / 10000;
                } else break;
            }
        }
    }

    /**
     * @notice function for premature withdrawal of funds
     * @param target withdrawal schedule target address
     */
    function emergencyWithdraw(address target) external onlyOwner {
        NonStandardVestingSchedule memory schedule = nonStandardSchedules[target];

        require(schedule.initialized, "Vesting:: Schedule does not exist");

        delete nonStandardSchedules[target];
        token.safeTransfer(msg.sender, schedule.totalAmount - schedule.released);
    }

    /**
     * @notice Allows the admin to create a new vesting schedules.
     * @param schedulesData an array of vesting schedules that will be created.
     */
    function createVestingScheduleBatch(ScheduleData[] memory schedulesData) external onlyOwner {
        uint256 length = schedulesData.length;
        uint256 tokenAmount;

        for (uint256 i = 0; i < length; i++) {
            ScheduleData memory schedule = schedulesData[i];

            tokenAmount += schedule.totalAmount;

            ensureValidVestingSchedule(schedule);
            require(!_isScheduleExist(schedule.target), "Vesting:: Schedule already exists");

            _createVestingSchedule(schedule);
        }

        token.safeTransferFrom(msg.sender, address(this), tokenAmount);
    }

    /**
     * @notice function for withdrawing tokens from the schedule
     * @param target withdrawal schedule target address.
     */
    function withdraw(address target) external {
        require(_isScheduleExist(target), "Vesting:: Schedule does not exist");

        bool isStandard = standardSchedules[target].initialized;
        uint256 amount;

        if (isStandard) {
            amount = _withdrawStandard(target, getTime());
        } else {
            amount = _withdrawNonStandard(target, getTime());
        }

        emit Withdrawn(target, amount);

        token.safeTransfer(target, amount);
    }

    function _withdrawStandard(address target, uint32 time) private returns (uint256 amount) {
        StandardVestingSchedule memory schedule = standardSchedules[target];
        require(stagePeriods[schedule.activeStage] <= time, "Vesting:: Enough time has not passed yet");
        uint16 stage;

        for (stage = schedule.activeStage; stage < stagePeriods.length; stage++) {
            if (time >= stagePeriods[stage]) {
                amount += (percentsPerStages[stage] * schedule.totalAmount) / 10000;
            } else break;
        }

        // Remove the vesting schedule if all tokens were released to the account.
        if (schedule.released + amount == schedule.totalAmount) {
            delete standardSchedules[target];
            return amount;
        }
        standardSchedules[target].released += amount;
        standardSchedules[target].activeStage = stage;
    }

    function _withdrawNonStandard(address target, uint32 time) private returns (uint256 amount) {
        NonStandardVestingSchedule memory schedule = nonStandardSchedules[target];
        require(schedule.stagePeriods[schedule.activeStage] <= time, "Vesting:: Enough time has not passed yet");
        uint16 stage;

        for (stage = schedule.activeStage; stage < schedule.stagePeriods.length; stage++) {
            if (time >= schedule.stagePeriods[stage]) {
                amount += (schedule.percentsPerStages[stage] * schedule.totalAmount) / 10000;
            } else break;
        }

        // Remove the vesting schedule if all tokens were released to the account.
        if (schedule.released + amount == schedule.totalAmount) {
            delete nonStandardSchedules[target];
            return amount;
        }
        nonStandardSchedules[target].released += amount;
        nonStandardSchedules[target].activeStage = stage;
    }

    function ensureValidVestingSchedule(ScheduleData memory schedule_) public pure {
        require(schedule_.target != address(0), "Vesting:: Target address cannot be zero");
        require(schedule_.totalAmount > 0, "Vesting:: Token amount cannot be zero");
        if (!schedule_.isStandard) {
            require((schedule_.percentsPerStages).length > 0, "Vesting:: Requires at least 1 stage");
            require(
                (schedule_.percentsPerStages).length == (schedule_.stagePeriods).length,
                "Vesting:: Invalid percents or stages"
            );
        }
    }

    function _isScheduleExist(address scheduleTarget) private view returns (bool) {
        return standardSchedules[scheduleTarget].initialized || nonStandardSchedules[scheduleTarget].initialized;
    }

    function _createVestingSchedule(ScheduleData memory scheduleData) private {
        if (scheduleData.isStandard) {
            _createStandardVestingSchedule(scheduleData);
        } else {
            _createNonStandardVestingSchedule(scheduleData);
        }
    }

    function _createStandardVestingSchedule(ScheduleData memory scheduleData) private {
        standardSchedules[scheduleData.target] = StandardVestingSchedule({
            initialized: true,
            totalAmount: scheduleData.totalAmount,
            released: 0,
            activeStage: 0
        });
        emit VestingScheduleAdded(scheduleData.target, true);
    }

    function _createNonStandardVestingSchedule(ScheduleData memory scheduleData) private {
        nonStandardSchedules[scheduleData.target] = NonStandardVestingSchedule({
            initialized: true,
            totalAmount: scheduleData.totalAmount,
            released: 0,
            activeStage: 0,
            percentsPerStages: scheduleData.percentsPerStages,
            stagePeriods: scheduleData.stagePeriods
        });
        emit VestingScheduleAdded(scheduleData.target, false);
    }

    function getSchedulePercents(address target) external view returns (uint16[] memory) {
        return nonStandardSchedules[target].percentsPerStages;
    }

    function getScheduleStagePeriods(address target) external view returns (uint32[] memory) {
        return nonStandardSchedules[target].stagePeriods;
    }

    function getTime() internal view virtual returns (uint32) {
        return uint32(block.timestamp / 60);
    }

    /**
     * @notice function to update schedule target address
     * @param from old target address.
     * @param to new target address.
     */
    function updateTarget(address from, address to) external {
        require(msg.sender == owner() || msg.sender == from, "Vesting:: Only owner all schedule target can call");
        require(
            !standardSchedules[to].initialized && !nonStandardSchedules[to].initialized,
            "Vesting:: to address already has a schedule"
        );

        bool isStandard = standardSchedules[from].initialized;
        if (isStandard) {
            standardSchedules[to] = standardSchedules[from];
            delete standardSchedules[from];
            return;
        }
        nonStandardSchedules[to] = nonStandardSchedules[from];
        delete nonStandardSchedules[from];
    }

    /**
     * @notice function to withdraw stuck tokens
     * @param _token token for withdraw.
     * @param _amount amount of tokens.
     */
    function inCaseTokensGetStuck(address _token, uint256 _amount) external onlyOwner {
        require(address(token) != _token, "Vesting:: Withdrawal token cannot be a schedule token");

        IERC20(_token).safeTransfer(msg.sender, _amount);
    }
}
