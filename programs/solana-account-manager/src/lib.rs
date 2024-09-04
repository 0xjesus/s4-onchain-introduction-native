use anchor_lang::prelude::*;

declare_id!("GdWFYaqLPJUuFoHMztLQQKqbyq1tWxXnRot2ckfavHTT");

#[program]
pub mod solana_account_manager {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let account = &mut ctx.accounts.my_account;
        account.balance = 0;
        msg!("Account initialized with a balance of 0.");
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let account = &mut ctx.accounts.my_account;

        // Transfer SOL from the user to the program account
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &account.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        account.balance += amount;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        let account = &mut ctx.accounts.my_account;

        let amount_to_withdraw = account.balance / 10; // 10% of the balance

        // Transfer SOL back to the user
        **account.to_account_info().try_borrow_mut_lamports()? -= amount_to_withdraw;
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += amount_to_withdraw;

        account.balance -= amount_to_withdraw;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 8, seeds = [b"my_account", user.key().as_ref()], bump)]
    pub my_account: Account<'info, MyAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut, seeds = [b"my_account", user.key().as_ref()], bump)]
    pub my_account: Account<'info, MyAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, seeds = [b"my_account", user.key().as_ref()], bump)]
    pub my_account: Account<'info, MyAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct MyAccount {
    pub balance: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The account is not initialized.")]
    AccountNotInitialized,
}
