module.exports = async ({deployments: { deploy }, ethers: { getNamedSigners, getContract }}) => {
	const { deployer } = await getNamedSigners();

	await deploy("MockToken", {
		from: deployer.address,
		contract: "MockToken",
		args: [],
		log: true,
	});

	return await getContract("MockToken");
};

module.exports.tags = ["MockToken", "Hardhat"];
