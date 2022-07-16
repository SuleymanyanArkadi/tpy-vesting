// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Vesting is Ownable {
    using SafeERC20 for IERC20;

    struct ScheduleData {
        uint256 totalAmount;
        address target;
        bool isStandard;
        uint8[] percentsPerStages;
        uint32[] stagePeriods;
    }

    struct StandardVestingSchedule {
        bool initialized;
        uint256 totalAmount;
        uint256 released;
        uint16 activeStage; // En stage-y voric araj claim a kanchvel
    }

    struct NonStandardVestingSchedule {
        bool initialized;
        uint256 totalAmount;
        uint256 released;
        uint16 activeStage; // En stage-y voric araj claim a kanchvel
        uint8[] percentsPerStages;
        uint32[] stagePeriods;
    }

    mapping(address => StandardVestingSchedule) public standardSchedules;
    mapping(address => NonStandardVestingSchedule) public nonStandardSchedules;

    IERC20 public token;

    uint16[9] public percentsPerStages = [3000, 750, 750, 750, 750, 1000, 1000, 1000, 1000]; // x * 0.01
    uint32[9] public stagePeriods = [28160701, 28293181, 28425661, 28558141, 28690621, 28823101, 28955581, 29088061]; // timestamp / 60

    bool public isWithdrawPaused;

    event VestingScheduleAdded(address target, ScheduleData schedule);
    event Withdrawn(address, uint256 withdrawn);
    event WithdrawnPaused(bool pauseState);

    constructor(IERC20 _token) {
        token = _token;
    }

    function setWithdrawPaused(bool isPaused_) external onlyOwner {
        emit WithdrawnPaused(isPaused_);
        isWithdrawPaused = isPaused_;
    }

    function createVestingScheduleBatch(ScheduleData[] memory schedulesData) external onlyOwner {
        uint256 length = schedulesData.length;

        for (uint256 i = 0; i < length; i++) {
            ScheduleData memory schedule = schedulesData[i];

            ensureValidVestingSchedule(schedule);
            require(!isScheduleExist(schedule.target), "Vesting:: Schedule already exists");

            createVestingSchedule(schedule);
        }
    }

    function withdraw(address target) external {
        require(!isWithdrawPaused, "Vesting:: Withdraw is paused");
        require(isScheduleExist(target), "Vesting:: Schedule does not exist");

        bool isStand = standardSchedules[target].initialized;
        uint32 time = uint32(block.timestamp / 60);
        uint256 amount;

        if (isStand) {
            amount = _withdrawStandard(target, time);
        } else {
            amount = _withdrawNonStandard(target, time);
        }

        uint256 tokenRemaining = token.balanceOf(address(this));
        require(amount <= tokenRemaining, "Vesting:: Insufficient token in vesting contract");

        emit Withdrawn(target, amount);

        require(token.transfer(target, amount));
    }

    function _withdrawStandard(address target, uint32 time) private returns (uint256 amount) {
        StandardVestingSchedule memory schedule = standardSchedules[target];

        uint16 stage;

        for (stage = schedule.activeStage; stage < stagePeriods.length; stage++) {
            if (time >= stagePeriods[stage]) {
                amount += (percentsPerStages[stage] * schedule.totalAmount) / 10000;
            } else break;
        }

        // Remove the vesting schedule if all tokens were released to the account.
        if (schedule.released + amount == schedule.totalAmount) {
            delete standardSchedules[target];
        }
        standardSchedules[target].released += amount;
        standardSchedules[target].activeStage = stage;
    }

    function _withdrawNonStandard(address target, uint32 time) private returns (uint256 amount) {
        NonStandardVestingSchedule memory schedule = nonStandardSchedules[target];

        uint16 stage;

        for (stage = schedule.activeStage; stage < schedule.stagePeriods.length; stage++) {
            if (time >= schedule.stagePeriods[stage]) {
                amount += (schedule.percentsPerStages[stage] * schedule.totalAmount) / 10000;
            } else break;
        }

        // Remove the vesting schedule if all tokens were released to the account.
        if (schedule.released + amount == schedule.totalAmount) {
            delete nonStandardSchedules[target];
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

    function isScheduleExist(address scheduleTarget) private view returns (bool) {
        return standardSchedules[scheduleTarget].initialized || nonStandardSchedules[scheduleTarget].initialized;
    }

    function createVestingSchedule(ScheduleData memory scheduleData) private {
        if (scheduleData.isStandard) {
            createStandardVestingSchedule(scheduleData);
        } else {
            createNonStandardVestingSchedule(scheduleData);
        }
    }

    function createStandardVestingSchedule(ScheduleData memory scheduleData) private {
        standardSchedules[scheduleData.target] = StandardVestingSchedule({
            initialized: true,
            totalAmount: scheduleData.totalAmount,
            released: 0,
            activeStage: 0
        });
    }

    function createNonStandardVestingSchedule(ScheduleData memory scheduleData) private {
        nonStandardSchedules[scheduleData.target] = NonStandardVestingSchedule({
            initialized: true,
            totalAmount: scheduleData.totalAmount,
            released: 0,
            activeStage: 0,
            percentsPerStages: scheduleData.percentsPerStages,
            stagePeriods: scheduleData.stagePeriods
        });
    }

    function getSchedulePercents(address target) external view returns (uint8[] memory) {
        return nonStandardSchedules[target].percentsPerStages;
    }

    function getScheduleStagePeriods(address target) external view returns (uint32[] memory) {
        return nonStandardSchedules[target].stagePeriods;
    }
}
