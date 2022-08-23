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
	let deployer, caller, vzgo, testToken, token, vesting, standardSchedules, nonStandardSchedules, mixedSchedules;

	const setupFixture = createFixture(async () => {
		await fixture(["", "Hardhat"]);

		const token = await getContract("TPYToken");
		const vesting = await getContract("Vesting");
		const testToken = await getContract("TestToken");

		await token.approve(vesting.address, constants.MaxUint256);

		const standardSchedules = [
			{
				totalAmount: parseEther("10000"),
				target: deployer.address,
				isStandard: true,
				percentsPerStages: [],
				stagePeriods: []
			},
			{
				totalAmount: parseEther("30000"),
				target: caller.address,
				isStandard: true,
				percentsPerStages: [],
				stagePeriods: []
			}
		];
		const nonStandardSchedules = [
			{
				totalAmount: parseEther("10000"),
				target: deployer.address,
				isStandard: false,
				percentsPerStages: [2000, 3000, 5000], // / 100
				stagePeriods: [28152060, 28162060, 28172060]
			},
			{
				totalAmount: parseEther("30000"),
				target: caller.address,
				isStandard: false,
				percentsPerStages: [2000, 3000, 5000], // / 100
				stagePeriods: [28152060, 28162060, 28172060]
			}
		];
		const mixedSchedules = [
			{
				totalAmount: parseEther("10000"),
				target: deployer.address,
				isStandard: true,
				percentsPerStages: [],
				stagePeriods: []
			},
			{
				totalAmount: parseEther("30000"),
				target: caller.address,
				isStandard: false,
				percentsPerStages: [2000, 3000, 5000], // / 100
				stagePeriods: [28152060, 28162060, 28172060]
			}
		];

		return [testToken, token, vesting, standardSchedules, nonStandardSchedules, mixedSchedules];
	});

	before("Before All: ", async function () {
		({ deployer, caller, vzgo } = await getNamedSigners());
	});

	beforeEach(async function () {
		[testToken, token, vesting, standardSchedules, nonStandardSchedules, mixedSchedules] = await setupFixture();
	});

	describe("Initialization: ", function () {
		it("Should initialize with correct values", async function () {
			expect(await vesting.token()).to.equal(token.address);
		});
	});

	describe("createVestingScheduleBatch: ", function () {
		it("Should create standard vesting schedules", async function () {
			await expect(vesting.createVestingScheduleBatch(standardSchedules))
				.to.emit(vesting, "NewSchedule")
				.withArgs(caller.address, true);

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
			await expect(vesting.createVestingScheduleBatch(nonStandardSchedules))
				.to.emit(vesting, "NewSchedule")
				.withArgs(caller.address, false);

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

		it("Should revert with 'Vesting::ZERO_TARGET'", async function () {
			const schedules = [
				{
					totalAmount: parseEther("10000"),
					target: constants.AddressZero,
					isStandard: true,
					percentsPerStages: [],
					stagePeriods: []
				}
			];
			await expect(vesting.createVestingScheduleBatch(schedules)).to.be.revertedWith(
				"Vesting::ZERO_TARGET"
			);
		});

		it("Should revert with 'Vesting::Vesting::ZERO_AMOUNT'", async function () {
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
				"Vesting::ZERO_AMOUNT"
			);
		});

		it("Should revert with 'Vesting::MISSING_STAGES'", async function () {
			const schedules = [
				{
					totalAmount: parseEther("10000"),
					target: deployer.address,
					isStandard: false,
					percentsPerStages: [],
					stagePeriods: []
				}
			];
			await expect(vesting.createVestingScheduleBatch(schedules)).to.be.revertedWith(
				"Vesting::MISSING_STAGES"
			);
		});

		it("Should revert with 'Vesting::INVALID_PERCENTS_OR_STAGES'", async function () {
			const schedules = [
				{
					totalAmount: parseEther("10000"),
					target: deployer.address,
					isStandard: false,
					percentsPerStages: [10, 20],
					stagePeriods: [10, 20, 30]
				}
			];
			await expect(vesting.createVestingScheduleBatch(schedules)).to.be.revertedWith(
				"Vesting::INVALID_PERCENTS_OR_STAGES"
			);
		});

		it("Should revert with 'Vesting::EXISTING_SCHEDULE'", async function () {
			const schedules = [
				{
					totalAmount: parseEther("10000"),
					target: deployer.address,
					isStandard: true,
					percentsPerStages: [],
					stagePeriods: []
				}
			];
			await vesting.createVestingScheduleBatch(schedules);

			await expect(vesting.createVestingScheduleBatch(schedules)).to.be.revertedWith(
				"Vesting::EXISTING_SCHEDULE"
			);
		});
	});

	describe("claimableAmount", function () {
		it("Standard", async function () {
			await vesting.createVestingScheduleBatch(standardSchedules);

			await vesting.setMockTime(28160701); // first stage
			expect(await vesting.claimableAmount(caller.address)).to.equal(
				standardSchedules[1].totalAmount.mul(30).div(100)
			);

			await vesting.setMockTime(28293181); // second stage
			expect(await vesting.claimableAmount(caller.address)).to.equal(
				standardSchedules[1].totalAmount.mul(375).div(1000)
			);

			await vesting.withdraw(caller.address);

			await vesting.setMockTime(28425661); // third stage
			expect(await vesting.claimableAmount(caller.address)).to.equal(
				standardSchedules[1].totalAmount.mul(75).div(1000)
			);
		});

		it("Non standard", async function () {
			await vesting.createVestingScheduleBatch(nonStandardSchedules);

			await vesting.setMockTime(28152060); // first stage
			expect(await vesting.claimableAmount(caller.address)).to.equal(
				nonStandardSchedules[1].totalAmount.mul(20).div(100)
			);

			await vesting.setMockTime(28162060); // second stage
			expect(await vesting.claimableAmount(caller.address)).to.equal(
				nonStandardSchedules[1].totalAmount.mul(50).div(100)
			);

			await vesting.withdraw(caller.address);

			await vesting.setMockTime(28172060); // third stage
			expect(await vesting.claimableAmount(caller.address)).to.equal(
				nonStandardSchedules[1].totalAmount.mul(50).div(100)
			);
		});

		it("Should revert with 'Vesting::MISSING_SCHEDULE'", async function () {
			await expect(vesting.claimableAmount(caller.address)).to.be.revertedWith("Vesting::MISSING_SCHEDULE");
		});
	});

	describe("withdraw: ", function () {
		describe("standard: ", function () {
			it("Should withdraw for first stage", async function () {
				await vesting.createVestingScheduleBatch(standardSchedules);
				await vesting.setMockTime(28160701); // first stage

				await expect(vesting.withdraw(caller.address))
					.to.emit(vesting, "Withdrawal")
					.withArgs(caller.address, standardSchedules[1].totalAmount.mul(30).div(100), true);

				expect(await vesting.standardSchedules(caller.address)).to.eql([
					true,
					BigNumber.from(standardSchedules[1].totalAmount),
					standardSchedules[1].totalAmount.mul(30).div(100),
					1
				]);
				expect(await token.balanceOf(caller.address)).to.equal(
					standardSchedules[1].totalAmount.mul(30).div(100)
				);
			});

			it("Should withdraw another time after first withdraw", async function () {
				await vesting.createVestingScheduleBatch(standardSchedules);
				await vesting.setMockTime(28160701); // first stage
				await vesting.withdraw(caller.address);
				await vesting.setMockTime(28293181); // second stage

				await expect(vesting.withdraw(caller.address))
					.to.emit(vesting, "Withdrawal")
					.withArgs(caller.address, standardSchedules[1].totalAmount.mul(75).div(1000), true);

				expect(await vesting.standardSchedules(caller.address)).to.eql([
					true,
					BigNumber.from(standardSchedules[1].totalAmount),
					standardSchedules[1].totalAmount.mul(375).div(1000),
					2
				]);
				expect(await token.balanceOf(caller.address)).to.equal(
					standardSchedules[1].totalAmount.mul(375).div(1000)
				);
			});

			it("Should withdraw tokens for 3 stages at once", async function () {
				await vesting.createVestingScheduleBatch(standardSchedules);
				await vesting.setMockTime(28425661); // third stage

				await expect(vesting.withdraw(caller.address))
					.to.emit(vesting, "Withdrawal")
					.withArgs(caller.address, standardSchedules[1].totalAmount.mul(45).div(100), true);

				expect(await vesting.standardSchedules(caller.address)).to.eql([
					true,
					BigNumber.from(standardSchedules[1].totalAmount),
					standardSchedules[1].totalAmount.mul(45).div(100),
					3
				]);
				expect(await token.balanceOf(caller.address)).to.equal(
					standardSchedules[1].totalAmount.mul(45).div(100)
				);
			});

			it("Should delete schedule after stages finish", async function () {
				await vesting.createVestingScheduleBatch(standardSchedules);
				await vesting.setMockTime(29088061); // last stage

				await expect(vesting.withdraw(caller.address))
					.to.emit(vesting, "Withdrawal")
					.withArgs(caller.address, standardSchedules[1].totalAmount, true);

				expect(await vesting.standardSchedules(caller.address)).to.eql([
					false,
					BigNumber.from(0),
					BigNumber.from(0),
					0
				]);
				expect(await token.balanceOf(caller.address)).to.equal(standardSchedules[1].totalAmount);
			});

			it("Should revert with 'Vesting::MISSING_SCHEDULE'", async function () {
				await expect(vesting.withdraw(caller.address)).to.be.revertedWith("Vesting::MISSING_SCHEDULE");
			});

			it("Should revert with 'Vesting::TOO_EARLY'", async function () {
				await vesting.createVestingScheduleBatch(standardSchedules);
				await expect(vesting.withdraw(caller.address)).to.be.revertedWith(
					"Vesting::TOO_EARLY"
				);
			});
		});

		describe("non-standard: ", function () {
			it("Should withdraw for first stage", async function () {
				await vesting.createVestingScheduleBatch(nonStandardSchedules);
				await vesting.setMockTime(nonStandardSchedules[1].stagePeriods[0]); // first stage

				await expect(vesting.withdraw(caller.address))
					.to.emit(vesting, "Withdrawal")
					.withArgs(caller.address, nonStandardSchedules[1].totalAmount.mul(20).div(100), false);

				expect(await vesting.nonStandardSchedules(caller.address)).to.eql([
					true,
					BigNumber.from(nonStandardSchedules[1].totalAmount),
					nonStandardSchedules[1].totalAmount.mul(20).div(100),
					1
				]);
				expect(await token.balanceOf(caller.address)).to.equal(
					nonStandardSchedules[1].totalAmount.mul(20).div(100)
				);
			});

			it("Should withdraw another time after first withdraw", async function () {
				await vesting.createVestingScheduleBatch(nonStandardSchedules);
				await vesting.setMockTime(nonStandardSchedules[1].stagePeriods[0]); // first stage
				await vesting.withdraw(caller.address);
				await vesting.setMockTime(nonStandardSchedules[1].stagePeriods[1]); // second stage

				await expect(vesting.withdraw(caller.address))
					.to.emit(vesting, "Withdrawal")
					.withArgs(caller.address, nonStandardSchedules[1].totalAmount.mul(30).div(100), false);

				expect(await vesting.nonStandardSchedules(caller.address)).to.eql([
					true,
					BigNumber.from(nonStandardSchedules[1].totalAmount),
					nonStandardSchedules[1].totalAmount.mul(50).div(100),
					2
				]);
				expect(await token.balanceOf(caller.address)).to.equal(
					nonStandardSchedules[1].totalAmount.mul(50).div(100)
				);
			});

			it("Should delete schedule after stages finish", async function () {
				await vesting.createVestingScheduleBatch(nonStandardSchedules);
				await vesting.setMockTime(nonStandardSchedules[1].stagePeriods[2]); // last stage

				await expect(vesting.withdraw(caller.address))
					.to.emit(vesting, "Withdrawal")
					.withArgs(caller.address, nonStandardSchedules[1].totalAmount, false);

				expect(await vesting.nonStandardSchedules(caller.address)).to.eql([
					false,
					BigNumber.from(0),
					BigNumber.from(0),
					0
				]);
				expect(await token.balanceOf(caller.address)).to.equal(nonStandardSchedules[1].totalAmount);
			});

			it("Should revert with 'Vesting::TOO_EARLY'", async function () {
				await vesting.createVestingScheduleBatch(nonStandardSchedules);
				await expect(vesting.withdraw(caller.address)).to.be.revertedWith(
					"Vesting::TOO_EARLY"
				);
			});
		});
	});

	describe("emergencyWithdraw: ", function () {
		it("Should withdraw all unreleased tokens after 2-nd stage", async function () {
			await vesting.createVestingScheduleBatch(nonStandardSchedules);
			await vesting.setMockTime(nonStandardSchedules[1].stagePeriods[1]); // second stage
			await vesting.withdraw(caller.address);

			expect(await token.balanceOf(caller.address)).to.equal(
				nonStandardSchedules[1].totalAmount.mul(50).div(100)
			);

			const unreleasedTokens = nonStandardSchedules[1].totalAmount.sub(
				nonStandardSchedules[1].totalAmount.mul(50).div(100)
			);
			await expect(() => vesting.emergencyWithdraw(caller.address)).to.changeTokenBalances(
				token,
				[vesting, deployer],
				[unreleasedTokens.mul(-1), unreleasedTokens]
			);
			expect(await vesting.nonStandardSchedules(caller.address)).to.eql([
				false,
				BigNumber.from(0),
				BigNumber.from(0),
				0
			]);
		});

		it("Should revert with 'Ownable: caller is not the owner'", async function () {
			await expect(vesting.connect(caller).emergencyWithdraw(caller.address)).to.be.revertedWith(
				"Ownable: caller is not the owner"
			);
		});

		it("Should revert with 'Vesting::MISSING_SCHEDULE'", async function () {
			await expect(vesting.emergencyWithdraw(caller.address)).to.be.revertedWith(
				"Vesting::MISSING_SCHEDULE"
			);
		});
	});

	describe("updateTarget: ", function () {
		it("Should update non standard vesting schedule", async function () {
			await vesting.createVestingScheduleBatch(mixedSchedules);

			await vesting.updateTarget(deployer.address, vzgo.address);
			expect(await vesting.standardSchedules(deployer.address)).to.eql([
				false,
				BigNumber.from(0),
				BigNumber.from(0),
				0
			]);
			expect(await vesting.standardSchedules(vzgo.address)).to.eql([
				true,
				BigNumber.from(mixedSchedules[0].totalAmount),
				BigNumber.from(0),
				0
			]);
		});

		it("Should update standard vesting schedule", async function () {
			await vesting.createVestingScheduleBatch(mixedSchedules);

			await vesting.connect(caller).updateTarget(caller.address, vzgo.address);
			expect(await vesting.nonStandardSchedules(caller.address)).to.eql([
				false,
				BigNumber.from(0),
				BigNumber.from(0),
				0
			]);
			expect(await vesting.nonStandardSchedules(vzgo.address)).to.eql([
				true,
				BigNumber.from(mixedSchedules[1].totalAmount),
				BigNumber.from(0),
				0
			]);
		});

		it("Should revert with 'Vesting::FORBIDDEN'", async function () {
			await expect(vesting.connect(caller).updateTarget(vzgo.address, caller.address)).to.be.revertedWith(
				"Vesting::FORBIDDEN"
			);
		});

		it("Should revert with 'Vesting::EXISTING_SCHEDULE'", async function () {
			await vesting.createVestingScheduleBatch(mixedSchedules);
			await expect(vesting.connect(caller).updateTarget(caller.address, deployer.address)).to.be.revertedWith(
				"Vesting::EXISTING_SCHEDULE"
			);
		});
	});

	describe("inCaseTokensGetStuck: ", function () {
		it("Should withdraw stuck tokens", async function () {
			await testToken.transfer(vesting.address, 10000);
			await expect(() => vesting.inCaseTokensGetStuck(testToken.address, 5000)).to.changeTokenBalances(
				testToken,
				[vesting, deployer],
				[-5000, 5000]
			);
		});

		it("Should revert with 'Ownable: caller is not the owner'", async function () {
			await expect(vesting.connect(caller).inCaseTokensGetStuck(testToken.address, 100)).to.be.revertedWith(
				"Ownable: caller is not the owner"
			);
		});

		it("Should revert with 'Vesting::FORBIDDEN'", async function () {
			await expect(vesting.inCaseTokensGetStuck(token.address, 100)).to.be.revertedWith(
				"Vesting::FORBIDDEN"
			);
		});
	});
});
