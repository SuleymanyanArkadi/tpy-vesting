module.exports = async ({ deployments: { deploy }, ethers: { getNamedSigners, getContract } }) => {
	const { deployer } = await getNamedSigners();

	const token = await getContract("MockToken");

	try {
		await deploy("Vesting", {
			from: deployer.address,
			contract: "Vesting",
			args: [token.address],
			log: true
		});
	} catch (error) {
		throw error.message;
	}

	return await getContract("Vesting");
};

module.exports.tags = ["Vesting", "bsc-testnet"];
module.exports.dependencies = ["MockToken"];
