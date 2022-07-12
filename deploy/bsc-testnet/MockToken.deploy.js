module.exports = async ({deployments: { deploy }, ethers: { getNamedSigners, getContract }}) => {
	const { deployer } = await getNamedSigners();

	try {
		await deploy("MockToken", {
			from: deployer.address,
			contract: "MockToken",
			args: [],
			log: true,
		});
	} catch (error) {
		throw error.message;
	}
	
	return await getContract("MockToken");
};

module.exports.tags = ["MockToken", "bsc-testnet"];
