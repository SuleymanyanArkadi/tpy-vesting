module.exports = async ({deployments: { deploy }, ethers: { getNamedSigners, getContract }}) => {
	const { deployer } = await getNamedSigners();

	try {
		await deploy("TPYToken", {
			from: deployer.address,
			contract: "TPYToken",
			args: [],
			log: true,
		});
	} catch (error) {
		throw error.message;
	}
	
	return await getContract("TPYToken");
};

module.exports.tags = ["TPYToken", "bsc-testnet"];
