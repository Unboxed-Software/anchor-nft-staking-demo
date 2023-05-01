import * as anchor from "@coral-xyz/anchor"
import { NftStakingTest } from "../target/types/nft_staking_test"
import {
  createMockNft,
  getProgramPdaInfo,
  getUserInfo,
  getUserStakeInfo,
} from "./test-utils"
import * as web3 from "@solana/web3.js"
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  mintTo,
} from "@solana/spl-token"
import { assert, expect } from "chai"

describe("nft-staking-test", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env())

  const program = anchor.workspace
    .NftStakingTest as anchor.Program<NftStakingTest>
  const wallet = anchor.workspace.NftStakingTest.provider.wallet

  let mint: web3.PublicKey
  let userTokenAccount: web3.PublicKey
  let userStakeInfo: web3.PublicKey
  let pdaNftAccount: web3.PublicKey
  let userInfo: web3.PublicKey

  before(async () => {
    const mockNftResult = await createMockNft(
      program.provider.connection,
      wallet.payer
    )

    mint = mockNftResult.mint
    userTokenAccount = mockNftResult.userTokenAccount

    userInfo = await getUserInfo(program, wallet.publicKey)

    userStakeInfo = await getUserStakeInfo(program, wallet.publicKey, mint)

    const pdaInfoResult = await getProgramPdaInfo(
      mint,
      wallet.publicKey,
      userStakeInfo
    )

    pdaNftAccount = pdaInfoResult.pdaNftAccount
  })

  it("Stake", async () => {
    let originalUserInfoAccount
    try {
      originalUserInfoAccount = await program.account.userInfo.fetch(userInfo)
    } catch {
      originalUserInfoAccount = undefined
    }

    const accounts = {
      userNftAccount: userTokenAccount,
      pdaNftAccount: pdaNftAccount,
      mint: mint,
    }

    await program.methods.stake().accounts(accounts).rpc()

    const userInfoAccount = await program.account.userInfo.fetch(userInfo)
    const userStakeInfoAccount = await program.account.userStakeInfo.fetch(
      userStakeInfo
    )

    expect(JSON.stringify(userStakeInfoAccount.stakeState)).to.equal(
      JSON.stringify({ staked: {} })
    )
    expect(userStakeInfoAccount.mint.toBase58()).to.equal(mint.toBase58())
    expect(userInfoAccount.activeStake).to.equal(
      (originalUserInfoAccount?.activeStake ?? 0) + 1
    )
  })

  it("Redeem", async () => {
    await program.methods.redeem().accounts({ mint }).rpc()
    const userInfoAccount = await program.account.userInfo.fetch(userInfo)
    expect(userInfoAccount.pointBalance.toNumber() > 0)
  })

  it("Unstake", async () => {
    const originalUserInfoAccount = await program.account.userInfo.fetch(
      userInfo
    )

    await program.methods
      .unstake()
      .accounts({
        mint,
        userNftAccount: userTokenAccount,
        pdaNftAccount,
      })
      .rpc()

    const userInfoAccount = await program.account.userInfo.fetch(userInfo)
    expect(userInfoAccount.activeStake).to.equal(
      (originalUserInfoAccount?.activeStake ?? 0) - 1
    )
  })
})
