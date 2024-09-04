import BN from "bn.js";
import assert from "assert";
import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import type { SolanaAccountManager } from "../target/types/solana_account_manager";
describe("Solana Account Manager Program", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaAccountManager as anchor.Program<SolanaAccountManager>;
  
  const program = anchor.workspace.SolanaAccountManager;
  let myAccountPDA;
  let bump;
  let initialBalance = 0;

  // Función para convertir lamports a SOL con dos decimales
  const lamportsToSol = (lamports) => (lamports / web3.LAMPORTS_PER_SOL).toFixed(2);

  // Helper function para verificar si la cuenta ya está inicializada y obtener el balance actual
  const getAccountBalance = async () => {
    try {
      const accountData = await program.account.myAccount.fetch(myAccountPDA);
      console.log(`ℹ️ Account already initialized with balance: ${lamportsToSol(accountData.balance.toNumber())} SOL`);
      return accountData.balance.toNumber();
    } catch (error) {
      console.log("ℹ️ Account not initialized, proceeding with initialization.");
      return 0;
    }
  };

  // Este hook se asegura de que la cuenta esté lista antes de cada prueba
  beforeEach(async () => {
    // Cálculo de la PDA
    [myAccountPDA, bump] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("my_account"), program.provider.publicKey.toBuffer()],
      program.programId
    );
    console.log("🔍 Calculated PDA for account:", myAccountPDA.toString());

    // Obtén el balance inicial de la cuenta antes de cada prueba
    initialBalance = await getAccountBalance();
    console.log(`📊 Initial balance before test: ${lamportsToSol(initialBalance)} SOL`);
  });

  it("Deposits SOL into the account", async () => {
    try {
      const depositAmount = new BN(web3.LAMPORTS_PER_SOL); // 1 SOL
      console.log(`📥 Preparing to deposit: ${lamportsToSol(depositAmount.toNumber())} SOL`);

      // Depósito de SOL
      const depositTxHash = await program.methods
        .deposit(depositAmount)
        .accounts({
          myAccount: myAccountPDA,
          user: program.provider.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      console.log(`✅ Deposit transaction hash: ${depositTxHash}`);
      await program.provider.connection.confirmTransaction(depositTxHash);
      console.log("✨ SOL deposited successfully.");

      // Verificación del balance actualizado
      const accountData = await program.account.myAccount.fetch(myAccountPDA);
      const newBalance = accountData.balance.toNumber();
      console.log(`💰 New balance after deposit: ${lamportsToSol(newBalance)} SOL`);
      const expectedBalance = initialBalance + depositAmount.toNumber();
      console.log(`🧮 Expected balance after deposit: ${lamportsToSol(expectedBalance)} SOL`);

      // Verifica que el balance actualizado sea el esperado
      assert.equal(
        newBalance,
        expectedBalance,
        `Balance should reflect the deposited amount of ${lamportsToSol(expectedBalance)} SOL`
      );
    } catch (error) {
      console.error("❌ Error during SOL deposit:", error);
      if (error.logs) {
        console.error("📝 Transaction logs:", error.logs);
      }
      throw error;
    }
  });

  it("Withdraws 10% of the deposited SOL", async () => {
    try {
      const accountDataBefore = await program.account.myAccount.fetch(myAccountPDA);
      const currentBalance = accountDataBefore.balance.toNumber();
      const withdrawAmount = Math.floor(currentBalance * 0.1);
      console.log(`📤 Preparing to withdraw 10% of the current balance: ${lamportsToSol(withdrawAmount)} SOL`);

      // Intento de retirar el 10% del balance
      const withdrawTxHash = await program.methods
        .withdraw()
        .accounts({
          myAccount: myAccountPDA,
          user: program.provider.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      console.log(`✅ Withdraw transaction hash: ${withdrawTxHash}`);
      await program.provider.connection.confirmTransaction(withdrawTxHash);
      console.log("✨ 10% SOL withdrawn successfully.");

      // Verificación del balance actualizado
      const accountDataAfter = await program.account.myAccount.fetch(myAccountPDA);
      const newBalance = accountDataAfter.balance.toNumber();
      console.log(`💰 New balance after withdrawal: ${lamportsToSol(newBalance)} SOL`);
      const expectedBalance = currentBalance - withdrawAmount;
      console.log(`🧮 Expected balance after withdrawal: ${lamportsToSol(expectedBalance)} SOL`);

      // Verifica que el balance actualizado sea el esperado
      assert.equal(
        newBalance,
        expectedBalance,
        `Balance should reflect the 10% withdrawal, expected: ${lamportsToSol(expectedBalance)} SOL`
      );
    } catch (error) {
      console.error("❌ Error during SOL withdrawal:", error);
      if (error.logs) {
        console.error("📝 Transaction logs:", error.logs);
      }
      throw error;
    }
  });
});
