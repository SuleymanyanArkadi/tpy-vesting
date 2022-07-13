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

    uint8[5] public percentsPerStages = [5, 10, 20, 30, 35];
    uint32[5] public stagePeriods = [1, 2, 3, 4, 5]; // 35765040

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
