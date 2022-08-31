module.exports = async ({ deployments: { deploy }, ethers: { getNamedSigners, getContract } }) => {
	const { deployer } = await getNamedSigners();

	const tokenAddress = "0x968Cbe62c830A0Ccf4381614662398505657A2A9"; 

	try {
		await deploy("Vesting", {
			from: deployer.address,
			contract: "Vesting",
			args: [tokenAddress],
			log: true
		});
	} catch (error) {
		throw error.message;
	}

	return await getContract("Vesting");
};

module.exports.tags = ["Vesting", "mainnet"];
