// module.exports = async ({ deployments: { deploy }, ethers: { getNamedSigners, getContractAt } }) => {
// 	const { deployer } = await getNamedSigners();

// 	const tokenAddress = "0x0"; TODO: add token address here

// 	try {
// 		await deploy("Vesting", {
// 			from: deployer.address,
// 			contract: "Vesting",
// 			args: [tokenAddress],
// 			log: true
// 		});
// 	} catch (error) {
// 		throw error.message;
// 	}

// 	return await getContract("Vesting");
// };

// module.exports.tags = ["Vesting", "bsc"];
