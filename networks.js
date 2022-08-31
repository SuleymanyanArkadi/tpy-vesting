const IS_TEST_DEPLOY = process.env.IS_TEST_DEPLOY === "true";
const NETWORK_TAG = process.env.NETWORK_TAG === "Hardhat";

let tag = "Hardhat";
let deploy = "./deploy/hardhat";

if (IS_TEST_DEPLOY) {
	tag = NETWORK_TAG;
	deploy = "./deploy";
}

module.exports = {
	networks: {
		localhost: {
			chainId: 31337,
			url: "http://127.0.0.1:8545"
		},
		hardhat: {
			chainId: 31337,
			forking: {
				enabled: false,
				url: `https://bsc.getblock.io/mainnet/?api_key=${process.env.FORKING_API_KEY}`
			},
			accounts: {
				mnemonic: "hen hair couple rose hover crush math mango private apology bid antique",
				path: "m/44'/60'/0'/0",
				initialIndex: "0",
				count: "20"
			},
			initialDate: new Date("01/01/2021"),
			allowUnlimitedContractSize: true,
			initialBaseFeePerGas: 0,
			tags: [tag],
			deploy: [deploy]
		},
		mainnet: {
			url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
			accounts: {
				mnemonic: "hen hair couple rose hover crush math mango private apology bid antique",
				path: "m/44'/60'/0'/0",
				initialIndex: 0,
				count: 20
			},
			chainId: 1,
			tags: ["mainnet"],
			deploy: ["./deploy/mainnet"]
		},
		rinkeby: {
			chainId: 4,
			accounts: {
				mnemonic: "hen hair couple rose hover crush math mango private apology bid antique",
				path: "m/44'/60'/0'/0",
				initialIndex: 0,
				count: 20
			},
			url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
			tags: ["rinkeby"],
			deploy: ["./deploy/rinkeby"]
		}
	},
	defaultConfig: {
		gasPrice: "auto"
	}
};
