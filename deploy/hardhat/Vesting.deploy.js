module.exports = async ({ deployments: { deploy }, ethers: { getNamedSigners, getContract } }) => {
	const { deployer } = await getNamedSigners();

	const token = await getContract("TPYToken");

	await deploy("Vesting", {
		from: deployer.address,
		contract: "VestingMock",
		args: [token.address],
		log: true
	});

	return await getContract("Vesting");
};

module.exports.tags = ["Vesting", "Hardhat"];
module.exports.dependencies = ["TPYToken"];
