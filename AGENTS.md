# Solana Development Rules

## Stack

- Anchor for programs
- @solana/kit for client
- Codama for IDL

## Constraints

- Always use PDAs
- Validate all accounts
- Avoid unsafe deserialization

## Testing

- Unit: LiteSVM / Mollusk
- Integration: Surfpool

## Security

- Prevent reentrancy
- Check signer + ownership
- Avoid unchecked accounts

## Compatibility

- Ensure Anchor + Solana CLI versions match
