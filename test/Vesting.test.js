const { expect } = require("chai");
const { BigNumber, constants } = require("ethers");
const {
	ethers: {
		getContract,
		getNamedSigners,
		utils: { parseEther }
	},
	deployments: { fixture, createFixture }
} = require("hardhat");

describe("Vesting", function () {
	let deployer, caller, token, vesting, standardSchedules, nonStandardSchedules, mixedSchedules;

	const setupFixture = createFixture(async () => {
		await fixture(["", "Hardhat"]);

		const token = await getContract("MockToken");
		const vesting = await getContract("Vesting");

		const standardSchedules = [
			{
				totalAmount: parseEther("10000000"),
				target: deployer.address,
				isStandard: true,
				percentsPerStages: [],
				stagePeriods: []
			},
			{
				totalAmount: parseEther("20000000"),
				target: caller.address,
				isStandard: true,
				percentsPerStages: [],
				stagePeriods: []
			}
		];
		const nonStandardSchedules = [
			{
				totalAmount: parseEther("10000000"),
				target: deployer.address,
				isStandard: false,
				percentsPerStages: [40, 60],
				stagePeriods: [1689123600, 1689642000]
			},
			{
				totalAmount: parseEther("20000000"),
				target: caller.address,
				isStandard: false,
				percentsPerStages: [40, 60],
				stagePeriods: [1689123600, 1689642000]
			}
		];
		const mixedSchedules = [
			{
				totalAmount: parseEther("10000000"),
				target: deployer.address,
				isStandard: true,
				percentsPerStages: [],
				stagePeriods: []
			},
			{
				totalAmount: parseEther("20000000"),
				target: caller.address,
				isStandard: false,
				percentsPerStages: [40, 60],
				stagePeriods: [1689123600, 1689642000]
			}
		];

		return [token, vesting, standardSchedules, nonStandardSchedules, mixedSchedules];
	});

	before("Before All: ", async function () {
		({ deployer, caller } = await getNamedSigners());
	});

	beforeEach(async function () {
		[token, vesting, standardSchedules, nonStandardSchedules, mixedSchedules] = await setupFixture();
	});

	describe("Initialization: ", function () {
		it("Should initialize with correct values", async function () {
			expect(await vesting.token()).to.equal(token.address);
			expect(await vesting.isWithdrawPaused()).to.equal(false);
			// TODO percents and stages
		});
	});

	describe("setWithdrawPaused: ", function () {
		it("Should set withdraw paused and emit event", async function () {
			await expect(vesting.setWithdrawPaused(true)).to.emit(vesting, "WithdrawnPaused").withArgs(true);
			expect(await vesting.isWithdrawPaused()).to.equal(true);
		});

		it("Should revert with 'Ownable: caller is not the owner'", async function () {
			await expect(vesting.connect(caller).setWithdrawPaused(true)).to.be.revertedWith(
				"Ownable: caller is not the owner"
			);
		});
	});

	describe("createVestingScheduleBatch: ", function () {
		it("Should create standard vesting schedules", async function () {
			// TODO add event and event checks
			await vesting.createVestingScheduleBatch(standardSchedules);

			expect(await vesting.standardSchedules(deployer.address)).to.eql([
				true,
				BigNumber.from(standardSchedules[0].totalAmount),
				BigNumber.from(0),
				0
			]);
			expect(await vesting.standardSchedules(caller.address)).to.eql([
				true,
				BigNumber.from(standardSchedules[1].totalAmount),
				BigNumber.from(0),
				0
			]);
		});

		it("Should create non standard vesting schedules", async function () {
			// TODO add event and event checks
			await vesting.createVestingScheduleBatch(nonStandardSchedules);

			expect(await vesting.nonStandardSchedules(deployer.address)).to.eql([
				true,
				BigNumber.from(nonStandardSchedules[0].totalAmount),
				BigNumber.from(0),
				0
			]);
			expect(await vesting.getSchedulePercents(deployer.address)).to.eql(
				nonStandardSchedules[0].percentsPerStages
			);
			expect(await vesting.getScheduleStagePeriods(deployer.address)).to.eql(
				nonStandardSchedules[0].stagePeriods
			);

			expect(await vesting.nonStandardSchedules(caller.address)).to.eql([
				true,
				BigNumber.from(nonStandardSchedules[1].totalAmount),
				BigNumber.from(0),
				0
			]);
			expect(await vesting.getSchedulePercents(caller.address)).to.eql(nonStandardSchedules[1].percentsPerStages);
			expect(await vesting.getScheduleStagePeriods(caller.address)).to.eql(nonStandardSchedules[1].stagePeriods);
		});

		it("Should create mixed vesting schedules", async function () {
			// TODO add event and event checks
			await vesting.createVestingScheduleBatch(mixedSchedules);

			expect(await vesting.standardSchedules(deployer.address)).to.eql([
				true,
				BigNumber.from(mixedSchedules[0].totalAmount),
				BigNumber.from(0),
				0
			]);

			expect(await vesting.nonStandardSchedules(caller.address)).to.eql([
				true,
				BigNumber.from(mixedSchedules[1].totalAmount),
				BigNumber.from(0),
				0
			]);
			expect(await vesting.getSchedulePercents(caller.address)).to.eql(nonStandardSchedules[1].percentsPerStages);
			expect(await vesting.getScheduleStagePeriods(caller.address)).to.eql(nonStandardSchedules[1].stagePeriods);
		});

		it("Should revert with 'Ownable: caller is not the owner'", async function () {
			await expect(vesting.connect(caller).createVestingScheduleBatch(standardSchedules)).to.be.revertedWith(
				"Ownable: caller is not the owner"
			);
		});

		it("Should revert with 'Vesting:: Target address cannot be zero'", async function () {
			const schedules = [
				{
					totalAmount: parseEther("10000000"),
					target: constants.AddressZero,
					isStandard: true,
					percentsPerStages: [],
					stagePeriods: []
				}
			];
			await expect(vesting.createVestingScheduleBatch(schedules)).to.be.revertedWith(
				"Vesting:: Target address cannot be zero"
			);
		});

		it("Should revert with 'Vesting:: Token amount cannot be zero'", async function () {
			const schedules = [
				{
					totalAmount: 0,
					target: deployer.address,
					isStandard: true,
					percentsPerStages: [],
					stagePeriods: []
				}
			];
			await expect(vesting.createVestingScheduleBatch(schedules)).to.be.revertedWith(
				"Vesting:: Token amount cannot be zero"
			);
		});

		it("Should revert with 'Vesting:: Requires at least 1 stage'", async function () {
			const schedules = [
				{
					totalAmount: parseEther("10000000"),
					target: deployer.address,
					isStandard: false,
					percentsPerStages: [],
					stagePeriods: []
				}
			];
			await expect(vesting.createVestingScheduleBatch(schedules)).to.be.revertedWith(
				"Vesting:: Requires at least 1 stage"
			);
		});

		it("Should revert with 'Vesting:: Invalid percents or stages'", async function () {
			const schedules = [
				{
					totalAmount: parseEther("10000000"),
					target: deployer.address,
					isStandard: false,
					percentsPerStages: [10, 20],
					stagePeriods: [10, 20, 30]
				}
			];
			await expect(vesting.createVestingScheduleBatch(schedules)).to.be.revertedWith(
				"Vesting:: Invalid percents or stages"
			);
		});

		it("Should revert with 'Vesting:: Schedule already exists'", async function () {
			const schedules = [
				{
					totalAmount: parseEther("10000000"),
					target: deployer.address,
					isStandard: true,
					percentsPerStages: [],
					stagePeriods: []
				}
			];
			await vesting.createVestingScheduleBatch(schedules);

			await expect(vesting.createVestingScheduleBatch(schedules)).to.be.revertedWith(
				"Vesting:: Schedule already exists"
			);
		});
	});
});
