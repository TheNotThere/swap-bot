require('dotenv').config();
const { ethers } = require("ethers");
const {price_conversion, getQuote, full_balance} = require(`./helper-me.js`);
const provider = new ethers.JsonRpcProvider("");//provider api url
const wallet = new ethers.Wallet("", provider);//wallet private key
const UNIVERSAL_ROUTER_ADDRESS = "0x2626664c2603336E57B271c5C0b26F421741e481"
// ERC20 ABI (for approve function)
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function fee() view returns (uint24)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function decimals() view returns (uint8)"
];
const weth = "0x4200000000000000000000000000000000000006"
const usdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

const slippage = 0.02
const ROUTER_ABI = [
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bytes",
            "name": "path",
            "type": "bytes"
          },
          {
            "internalType": "address",
            "name": "recipient",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amountIn",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "amountOutMinimum",
            "type": "uint256"
          }
        ],
        "internalType": "struct IV3SwapRouter.ExactInputParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "exactInput",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },

  {
    "name": "swapExactTokensForTokens",
    "type": "function",
    "stateMutability": "payable",
    "inputs": [
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
      { "internalType": "address[]", "name": "path", "type": "address[]" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "outputs": [
      { "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }
    ],
    "stateMutability": "payable"
  },
  {
    "name": "exactInputSingle",
    "type": "function",
    "stateMutability": "payable",
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "tokenIn", "type": "address" },
          { "internalType": "address", "name": "tokenOut", "type": "address" },
          { "internalType": "uint24", "name": "fee", "type": "uint24" },
          { "internalType": "address", "name": "recipient", "type": "address" },
          { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
          { "internalType": "uint256", "name": "amountOutMinimum", "type": "uint256" },
          { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" }
        ],
        "internalType": "struct IV3SwapRouter.ExactInputSingleParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "outputs": [
      { "internalType": "uint256", "name": "amountOut", "type": "uint256" }
    ]
  }
];
const router = new ethers.Contract(UNIVERSAL_ROUTER_ADDRESS,ROUTER_ABI,wallet)


async function swaper(swapParams) {
  
  console.log(swapParams)
  const amountIn = ethers.parseUnits(swapParams.amountIn.toFixed(18).toString(),swapParams.tokenInDecimals);

  const params = {
    
    path: ethers.solidityPacked(
    ['address', 'uint24', 'address', 'uint24', 'address'],
    [
      swapParams.tokenIn,
      swapParams.poolfee1,
      swapParams.tokenOut,
      swapParams.poolfee2,
      swapParams.tokenIn
    ]
  ),
  recipient: wallet.address,
  deadline: Math.floor(Date.now() / 1000) + 60 * 10, // 10 minutes from now
  amountIn: amountIn,
  amountOutMinimum: amountIn  
  };
 
 
  try {
  tx = await router.exactInput(params);
  await tx.wait();
    
    console.log(`Transaction submitted: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`-------------------------------------------------------------------------\nABRIDGE COMPLETE\n-------------------------------------------------------------------------`)
  } catch (err) {
    console.error('Swap failed:', err);
  }

}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function colorDiff(diff) {
  if (diff >= 0) {
    // Green bold
    return `\x1b[1m\x1b[32m+${diff}%\x1b[0m`;
  } else {
    // Red bold
    return `\x1b[1m\x1b[31m${diff}%\x1b[0m`;
  }
}

async function swap_brain(tokenAddr,pool1,pool2,amountToSpend,pricediff) {


  const poolfee1 = await new ethers.Contract(pool1,ERC20_ABI,provider).fee()


  const pool1token0 = await new ethers.Contract(pool1,ERC20_ABI,provider).token0()
  
  const pool1token1 = await new ethers.Contract(pool1,ERC20_ABI,provider).token1()
  const zeroforone1 = tokenAddr.toLowerCase() === pool1token0.toLowerCase();
  let pool1tokenIn
  if (pool1token0 == tokenAddr)

    {
      pool1tokenIn = pool1token1
    }
  else
  {
    pool1tokenIn = pool1token0
  }
  

  const pool2token0 = await new ethers.Contract(pool2,ERC20_ABI,provider).token0()
  const pool2token1 = await new ethers.Contract(pool2,ERC20_ABI,provider).token1()
  const zeroforone2 = tokenAddr.toLowerCase() === pool2token0.toLowerCase();
  let pool2tokenIn
  if (pool2token0 == tokenAddr)

    {
      pool2tokenIn = pool2token1
    }
  else
  {
    pool2tokenIn = pool2token0
  }
  const poolfee2 = await new ethers.Contract(pool2,ERC20_ABI,provider).fee()

  
  
  const tokenAddrDecimals = await new ethers.Contract(tokenAddr,ERC20_ABI,provider).decimals()
  const pool2tokenInDecimals = await new ethers.Contract(pool2tokenIn,ERC20_ABI,provider).decimals()
  const pool1tokenInDecimals = await new ethers.Contract(pool1tokenIn,ERC20_ABI,provider).decimals()
  const amountIn = ethers.parseUnits(amountToSpend.toString(),18)
  //MAKRE SURE TO APPROVE BEFORE HAND
  //const token = new ethers.Contract(weth,ERC20_ABI, wallet);
  //const atx = await token.approve(UNIVERSAL_ROUTER_ADDRESS, ethers.MaxUint256)
  //console.log("approved")
  //await atx.wait()
  //const token1 = new ethers.Contract(tokenAddr,ERC20_ABI, wallet);
  //const atx1 = await token1.approve(UNIVERSAL_ROUTER_ADDRESS, ethers.MaxUint256)
  //console.log("approved")
  //await atx1.wait()
  while (true) {
  try{
  
  let pool1Price =await price_conversion(pool1,zeroforone1,pool1tokenInDecimals)
  let pool2Price = await price_conversion(pool2,zeroforone2,pool2tokenInDecimals)
  // 1 -> 2
   let params = {
    
    path: ethers.solidityPacked(
    ['address', 'uint24', 'address', 'uint24', 'address'],
    [
      pool1tokenIn,
      poolfee1,
      tokenAddr,
      poolfee2,
      pool2tokenIn
    ]
  ),
  recipient: wallet.address,
  deadline: Math.floor(Date.now() / 1000) + 60 * 10, // 10 minutes from now
  amountIn: amountIn,
  amountOutMinimum: 0
  };
  
  let quote1_2 = await router.exactInput.staticCall(params);
  quote1_2 = ethers.formatUnits(quote1_2, pool2tokenInDecimals)
  let slippage1_2 = quote1_2/amountToSpend

  // 2 -> 1
  let path2_1 = ethers.solidityPacked(
    ['address', 'uint24', 'address', 'uint24', 'address'],
    [
      pool2tokenIn,
      poolfee2,
      tokenAddr,
      poolfee1,
      pool1tokenIn
    ]
  )
  params.path = path2_1
  let quote2_1 = await router.exactInput.staticCall(params);

  quote2_1 = ethers.formatUnits(quote2_1, pool1tokenInDecimals);
  let slippage2_1 = quote2_1/amountToSpend

  console.log(`\x1b[96m[1->2] Profit: ${colorDiff(((slippage1_2-1) * 100).toFixed(3))}\n\x1b[96m[2->1] Profit: ${colorDiff(((slippage2_1-1) * 100).toFixed(3))}\x1b[0m`)

  let price_2_1 =  (slippage2_1-1) *100
  let price_1_2 =  (slippage1_2-1) *100
  if (price_2_1> pricediff)
  {
    console.log(`\x1b[35m[Pool2 -> Pool1] Profit: \x1b[0m${colorDiff(price_2_1.toFixed(3).toString())} \x1b[35mWanted:\x1b[0m ${colorDiff(pricediff.toString())}`)
    swapParams = 
    {
      amountIn: amountToSpend,
      tokenIn:pool2tokenIn,
      tokenInDecimals:pool2tokenInDecimals,
      tokenOut:tokenAddr,
      poolfee1:poolfee2,
      poolfee2:poolfee1
    }

    await swaper(swapParams)
  }
  else if (price_1_2> pricediff)
  {
    console.log(`\x1b[35m[Pool1 -> Pool2] Profit: \x1b[0m${colorDiff(price_1_2.toFixed(3).toString())} \x1b[35mWanted:\x1b[0m ${colorDiff(pricediff.toString())}`)
    swapParams = 
    {
      amountIn: amountToSpend,
      tokenIn:pool1tokenIn,
      tokenInDecimals:pool1tokenInDecimals,
      tokenOut:tokenAddr,
      poolfee1:poolfee1,
      poolfee2:poolfee2
    }
    

    await swaper(swapParams)
  }
  if (price_2_1 > price_1_2){
    console.log(`\x1b[35m[Pool2 -> Pool1] Pure Difference: \x1b[0m${colorDiff(((pool1Price/pool2Price-1) * 100).toFixed(3))}`)
    console.log(`\x1b[35m[Pool2 -> Pool1] Profit: \x1b[0m${colorDiff(price_2_1.toFixed(3).toString())} \x1b[35mWanted:\x1b[0m ${colorDiff(pricediff.toString())}\n`)

  }

  else{
    console.log(`\x1b[35m[Pool1 -> Pool2] Pure Difference: \x1b[0m${colorDiff(((pool2Price/pool1Price-1) * 100).toFixed(3))}`)
    console.log(`\x1b[35m[Pool1 -> Pool2] Profit: \x1b[0m${colorDiff(price_1_2.toFixed(3).toString())} \x1b[35mWanted:\x1b[0m ${colorDiff(pricediff.toString())}\n`)

  }
  await sleep(3000)
  }
    catch (err)
  {
    console.log(err)
  }
}


}

swap_brain("",//Token Address
"",//Pool 1 Address
"",//Pool 2 Address
0,// Amount In Weth To Use
0)// Profit PERCENT To Sell At
