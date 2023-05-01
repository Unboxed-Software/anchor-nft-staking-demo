import * as web3 from "@solana/web3.js"
import * as anchor from "@coral-xyz/anchor"
import {
  createMint,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token"
import { NftStakingTest } from "../target/types/nft_staking_test"

export const getProgramPdaInfo = async (
  mint: web3.PublicKey,
  staker: web3.PublicKey,
  userStakeInfo: web3.PublicKey
) => {
  const userNftAccount = await getAssociatedTokenAddress(mint, staker)

  const pdaNftAccount = await getAssociatedTokenAddress(
    mint,
    userStakeInfo,
    true
  )

  return { userNftAccount, pdaNftAccount }
}

export const getUserInfo = (
  program: anchor.Program<NftStakingTest>,
  userPubkey: web3.PublicKey
) => {
  const [userInfo, _userInfoBump] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode("user")),
      userPubkey.toBuffer(),
    ],
    program.programId
  )
  return userInfo
}

export const getUserStakeInfo = (
  program: anchor.Program<NftStakingTest>,
  userPubkey: web3.PublicKey,
  nftMint: web3.PublicKey
) => {
  const [userStakeInfo, _userStakeInfoBump] =
    web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode("stake_info")),
        userPubkey.toBuffer(),
        nftMint.toBuffer(),
      ],
      program.programId
    )
  return userStakeInfo
}

export const createMockNft = async (
  connection: web3.Connection,
  signer: web3.Keypair
): Promise<{ mint: web3.PublicKey; userTokenAccount: web3.PublicKey }> => {
  const keypair = web3.Keypair.generate()
  const sig = await connection.requestAirdrop(
    keypair.publicKey,
    web3.LAMPORTS_PER_SOL * 2
  )
  await connection.confirmTransaction(sig)
  // Add your test here.
  const mockNftMint = await createMint(
    connection,
    keypair,
    keypair.publicKey,
    keypair.publicKey,
    0
  )

  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    signer,
    mockNftMint,
    signer.publicKey
  )

  await mintTo(
    connection,
    keypair,
    mockNftMint,
    tokenAccount.address,
    keypair,
    1
  )

  return { mint: mockNftMint, userTokenAccount: tokenAccount.address }
}
