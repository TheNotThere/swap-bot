require('dotenv').config();
module.exports = {getQuote, price_conversion,full_balance}
const { BigNumber } = require('bignumber.js');
const { ethers } = require('ethers');



const provider = new ethers.JsonRpcProvider("");//provider api url


const FEE = 3000;



const QUOTER_ADDRESS = "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a";
const WETH = '0x4200000000000000000000000000000000000006';
const QUOTER_ABI =[
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "path",
        "type": "bytes"
      },
      {
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      }
    ],
    "name": "quoteExactInput",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

const abi = [
    {
        "inputs": [],
        "name": "slot0",
        "outputs": [
            {"internalType": "uint160", "name": "sqrtPriceX96", "type": "uint160"},
            {"internalType": "int24", "name": "tick", "type": "int24"},
            {"internalType": "uint16", "name": "observationIndex", "type": "uint16"},
            {"internalType": "uint16", "name": "observationCardinality", "type": "uint16"},
            {"internalType": "uint16", "name": "observationCardinalityNext", "type": "uint16"},
            {"internalType": "uint8", "name": "feeProtocol", "type": "uint8"},
            {"internalType": "bool", "name": "unlocked", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]
async function getQuote(path,amountIn,tokenOutDecimals) {
  const iface = new ethers.Interface(QUOTER_ABI);
  console.log("[Fetching Quote]")

  const encodedCall = iface.encodeFunctionData("quoteExactInput", [path,amountIn]);
  try {
    const rawResult = await provider.call({
      to: QUOTER_ADDRESS,
      data: encodedCall
    });
    const amountOut = iface.decodeFunctionResult("quoteExactInput", rawResult);

    console.log("Estimated amount out:", ethers.formatUnits(amountOut[0], tokenOutDecimals)); // tokenOut usually has 6 decimals
    return ethers.formatUnits(amountOut[0], tokenOutDecimals);
  } catch (error) {
    console.error("Error getting quote:", error);
  }
  
}
const weth = "0x4200000000000000000000000000000000000006"
const usdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
const ERC20 = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
];
async function full_balance(address,tokenaddress,provide = null) {
  if (provide)
  {
    const balance = await provider.getBalance(address);
    console.log(ethers.formatEther(balance))
    return parseFloat(ethers.formatEther(balance))

  }
  const router = new ethers.Contract(tokenaddress, ERC20,provider)
  const balance = await router.balanceOf(address)
  let humanReadable
  if (tokenaddress == usdc)
  {humanReadable = ethers.formatUnits(balance, 6);}
  else{
    humanReadable = ethers.formatUnits(balance, 18);
  }


  console.log(humanReadable);
  return humanReadable;
}

const Q96 = new BigNumber(2).pow(96);

function sqrtPriceX96ToPrice(sqrtPriceX96, token0Decimals, token1Decimals) {
  const sqrt = new BigNumber(sqrtPriceX96.toString());
  const Q192 = new BigNumber(2).pow(192);

  const priceX192 = sqrt.pow(2); // square sqrtPriceX96
  const decimalAdjustment = new BigNumber(10).pow(token0Decimals - token1Decimals);

  const price = priceX192.dividedBy(Q192).multipliedBy(decimalAdjustment);
  return price;
}
async function safeSlot0(router, name = "router", retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await router.slot0();
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ${name}.slot0() failed on attempt ${i + 1}:`, error.message);
      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }

  console.error(`${name}.slot0() failed after ${retries} attempts`);
  return null; // ❗ Prevents crash
}

async function price_conversion(poolAddress,zeroforone,tokenDecimals,priceOfWeth = false) {
  const router = new ethers.Contract("0xd0b53D9277642d899DF5C87A3966A349A798F224",abi,provider)
  const router2 = new ethers.Contract(poolAddress, abi,provider)
  const slot0_2 = await safeSlot0(router2, "router2");
  const slot0 = await safeSlot0(router, "router1");
  const sqrt2 = slot0_2[0]
  const sqrt1 = slot0[0]
  const price = sqrtPriceX96ToPrice(sqrt1,18,6)
  if (priceOfWeth)
  {
    console.log(`\x1b[94m[Price]${price.toFixed(18).toString()}\x1b[0m`)
    return price.toFixed(18)
  }

  if (zeroforone == false)
  {
  const price2 = sqrtPriceX96ToPrice(sqrt2,18,parseInt(tokenDecimals));
  const price22 = new BigNumber(1).dividedBy(price2)
  const result = new BigNumber(price).multipliedBy(price22)
  console.log(`\x1b[94m[Price] ${result.toFixed(18).toString()}\x1b[0m`)
  return result.toFixed(18)
  }
  else{
    const price2 = sqrtPriceX96ToPrice(sqrt2,parseInt(tokenDecimals),18);
   const result = new BigNumber(price).multipliedBy(price2)
   console.log(`\x1b[94m[Price] ${result.toFixed(18).toString()}\x1b[0m`)
    return result.toFixed(18)
  }
}


  

