# Blockchain-based KYC (Know Your Customer) System

## Overview
This smart contract implements a decentralized Know Your Customer (KYC) system on the Stacks blockchain using Clarity smart contract language. The system allows for customer registration, verification, business approval, and document management.

## Features
- Customer Registration
- Business Approval
- Customer Verification
- KYC Level Management
- Document Hash Storage
- Role-based Access Control

## Contract Functions

### Customer Management
- `add-customer`: Register a new customer
- `verify-customer`: Verify a customer by an approved business
- `update-kyc-level`: Update a customer's KYC verification level
- `upload-customer-document`: Upload document hash for a customer

### Business Management
- `approve-business`: Approve a new business by contract owner
- `revoke-business`: Revoke business approval

### Read-only Functions
- `get-customer-details`: Retrieve customer information
- `is-customer-verified`: Check customer verification status
- `get-customer-kyc-level`: Get customer's KYC level
- `get-customer-document`: Retrieve customer document details
- `is-business-approved`: Check business approval status
- `get-business-details`: Retrieve business information

## KYC Levels
- Level 1: Basic Registration
- Level 2: Partially Verified
- Level 3: Fully Verified

## Error Handling
The contract includes specific error codes for various scenarios:
- `err-unauthorized`: Unauthorized access attempt
- `err-already-exists`: Duplicate registration
- `err-not-found`: Resource not found
- `err-already-verified`: Duplicate verification
- `err-invalid-kyc-level`: Invalid KYC level
- `err-document-already-exists`: Document already uploaded

## Security Considerations
- Only contract owner can approve/revoke businesses
- Customers can only upload their own documents
- Verification requires approved business

## Deployment
1. Ensure you have a Stacks wallet
2. Compile the smart contract
3. Deploy to Stacks blockchain

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License
[MIT]