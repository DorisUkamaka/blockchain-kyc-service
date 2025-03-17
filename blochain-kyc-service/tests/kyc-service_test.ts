import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
 tests
    name: "Ensure that customer registration works correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const wallet1 = accounts.get("wallet_1")!;

        let block = chain.mineBlock([
            Tx.contractCall(
                "kyc-service",
                "add-customer",
                [
                    types.utf8("John Doe"),
                    types.uint(19900101),
                    types.utf8("USA")
                ],
                wallet1.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok u1)');
      
    name: "Ensure that a customer can be added and retrieved correctly",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const customer = accounts.get('wallet_1')!;
        const customerName = "John Doe";
        const dateOfBirth = 19900101;
        const residenceCountry = "USA";

        let block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'add-customer',
                [
                    types.utf8(customerName),
                    types.uint(dateOfBirth),
                    types.utf8(residenceCountry)
                ],
                customer.address
            )
        ]);
        assertEquals(block.receipts.length, 1);
      main
        assertEquals(block.height, 2);
    },
});


Clarinet.test({
    name: "Ensure that only contract owner can approve business",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get("deployer")!;
        const wallet1 = accounts.get("wallet_1")!;
        const wallet2 = accounts.get("wallet_2")!;

        let block = chain.mineBlock([
            Tx.contractCall(
                "kyc-service",
                "approve-business",
                [
                    types.principal(wallet1.address),
                    types.utf8("Business 1"),
                    types.utf8("Finance")
                ],
                deployer.address
            ),
            // Should fail - non-owner trying to approve
            Tx.contractCall(
                "kyc-service",
                "approve-business",
                [
                    types.principal(wallet2.address),
                    types.utf8("Business 2"),
                    types.utf8("Finance")
                ],
                wallet1.address
            )
        ]);

        assertEquals(block.receipts.length, 2);
        assertEquals(block.receipts[0].result, '(ok u1)');
        assertEquals(block.receipts[1].result, '(err u100)'); // err-unauthorized
    },
});

// Document Management Tests
Clarinet.test({
    name: "Ensure document type registration and deactivation works",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get("deployer")!;

        let block = chain.mineBlock([
            Tx.contractCall(
                "kyc-service",
                "register-document-type",
                [
                    types.utf8("passport"),
                    types.uint(2), // required KYC level
                    types.uint(52560) // expiry blocks (approximately 1 year)
                ],
                deployer.address
            ),
            Tx.contractCall(
                "kyc-service",
                "get-document-type-info",
                [types.utf8("passport")],
                deployer.address
            )
        ]);

 tests
        assertEquals(block.receipts.length, 2);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Now deactivate the document type
        block = chain.mineBlock([
            Tx.contractCall(
                "kyc-service",
                "deactivate-document-type",
                [types.utf8("passport")],
                deployer.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(ok true)');
    },
});


Clarinet.test({
    name: "Ensure customer verification flow works correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get("deployer")!;
        const wallet1 = accounts.get("wallet_1")!;
        const wallet2 = accounts.get("wallet_2")!;

        // First approve a business and add a customer
        let block = chain.mineBlock([
            Tx.contractCall(
                "kyc-service",
                "approve-business",
                [
                    types.principal(wallet1.address),
                    types.utf8("Verifier Co"),
                    types.utf8("KYC Provider")
                ],
                deployer.address
            ),
            Tx.contractCall(
                "kyc-service",
                "add-customer",
                [
                    types.utf8("Jane Doe"),
                    types.uint(19900101),
                    types.utf8("USA")
                ],
                wallet2.address
            )
        ]);

        // Now verify the customer
        block = chain.mineBlock([
            Tx.contractCall(
                "kyc-service",
                "verify-customer",
                [types.uint(1), types.uint(1)],
                wallet1.address
            ),
            Tx.contractCall(
                "kyc-service",
                "is-customer-verified",
                [types.uint(1)],
                wallet1.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(ok true)');
        assertEquals(block.receipts[1].result, 'true');

        const customerId = block.receipts[0].result;
        const customerDetails = chain.callReadOnlyFn(
            'your-contract-name',
            'get-customer-details',
            [types.uint(customerId)],
            deployer.address
        );
        assertEquals(customerDetails.result.expectSome().expectTuple()['name'], types.utf8(customerName));
    },
});

Clarinet.test({
    name: "Ensure that only the contract owner can approve a business",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const nonOwner = accounts.get('wallet_1')!;
        const businessName = "Tech Corp";
        const businessType = "Technology";

        let block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'approve-business',
                [
                    types.principal(nonOwner.address),
                    types.utf8(businessName),
                    types.utf8(businessType)
                ],
                nonOwner.address
            )
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(err u100)`); // err-unauthorized
    },
});

Clarinet.test({
    name: "Ensure that a business can be approved and then revoked by the owner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const business = accounts.get('wallet_1')!;
        const businessName = "Tech Corp";
        const businessType = "Technology";

        let block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'approve-business',
                [
                    types.principal(business.address),
                    types.utf8(businessName),
                    types.utf8(businessType)
                ],
                deployer.address
            )
        ]);
        assertEquals(block.receipts.length, 1);
        const businessId = block.receipts[0].result;

        block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'revoke-business',
                [types.uint(businessId)],
                deployer.address
            )
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(ok true)`);

        const businessDetails = chain.callReadOnlyFn(
            'your-contract-name',
            'get-business-details',
            [types.uint(businessId)],
            deployer.address
        );
        assertEquals(businessDetails.result.expectSome().expectTuple()['is-approved'], types.bool(false));
    },
});

Clarinet.test({
    name: "Ensure that a customer can upload a document and it can be retrieved",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const customer = accounts.get('wallet_1')!;
        const documentType = "Passport";
        const documentHash = types.buff(new Uint8Array(32).fill(1));

        // First, add a customer
        let block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'add-customer',
                [
                    types.utf8("John Doe"),
                    types.uint(19900101),
                    types.utf8("USA")
                ],
                customer.address
            )
        ]);
        const customerId = block.receipts[0].result;

        // Then, upload a document
        block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'upload-customer-document',
                [
                    types.uint(customerId),
                    types.utf8(documentType),
                    documentHash
                ],
                customer.address
            )
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(ok true)`);

        // Retrieve the document
        const documentDetails = chain.callReadOnlyFn(
            'your-contract-name',
            'get-customer-document',
            [types.uint(customerId), types.utf8(documentType)],
            deployer.address
        );
        assertEquals(documentDetails.result.expectSome().expectTuple()['document-hash'], documentHash);
    },
});

Clarinet.test({
    name: "Ensure that a customer's KYC level can be updated by the contract owner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const customer = accounts.get('wallet_1')!;
        const newKycLevel = 2;

        // First, add a customer
        let block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'add-customer',
                [
                    types.utf8("John Doe"),
                    types.uint(19900101),
                    types.utf8("USA")
                ],
                customer.address
            )
        ]);
        const customerId = block.receipts[0].result;

        // Then, update the KYC level
        block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'update-kyc-level',
                [types.uint(customerId), types.uint(newKycLevel)],
                deployer.address
            )
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(ok true)`);

        // Retrieve the updated KYC level
        const kycLevel = chain.callReadOnlyFn(
            'your-contract-name',
            'get-customer-kyc-level',
            [types.uint(customerId)],
            deployer.address
        );
        assertEquals(kycLevel.result, `(some ${newKycLevel})`);
    },
});

Clarinet.test({
    name: "Ensure that a customer can be verified by an approved business",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const customer = accounts.get('wallet_1')!;
        const business = accounts.get('wallet_2')!;
        const businessName = "Tech Corp";
        const businessType = "Technology";

        // First, approve a business
        let block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'approve-business',
                [
                    types.principal(business.address),
                    types.utf8(businessName),
                    types.utf8(businessType)
                ],
                deployer.address
            )
        ]);
        const businessId = block.receipts[0].result;

        // Then, add a customer
        block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'add-customer',
                [
                    types.utf8("John Doe"),
                    types.uint(19900101),
                    types.utf8("USA")
                ],
                customer.address
            )
        ]);
        const customerId = block.receipts[0].result;

        // Finally, verify the customer
        block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'verify-customer',
                [types.uint(customerId), types.uint(businessId)],
                business.address
            )
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(ok true)`);

        // Check if the customer is verified
        const isVerified = chain.callReadOnlyFn(
            'your-contract-name',
            'is-customer-verified',
            [types.uint(customerId)],
            deployer.address
        );
        assertEquals(isVerified.result, `true`);
    },
});

Clarinet.test({
tests
    name: "Ensure document upload and retrieval works",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const wallet1 = accounts.get("wallet_1")!;

        // First add a customer
        let block = chain.mineBlock([
            Tx.contractCall(
                "kyc-service",
                "add-customer",
                [
                    types.utf8("Alice"),
                    types.uint(19900101),
                    types.utf8("USA")
                ],
                wallet1.address
            )
        ]);

        const documentHash = '0x1234567890123456789012345678901234567890123456789012345678901234';

        // Upload document
        block = chain.mineBlock([
            Tx.contractCall(
                "kyc-service",
                "upload-customer-document",
                [
                    types.uint(1),
                    types.utf8("passport"),
                    // types.buff(Buffer.from(documentHash.slice(2), 'hex'))
                ],
                wallet1.address
            ),
            Tx.contractCall(
                "kyc-service",
                "get-customer-document",
                [types.uint(1), types.utf8("passport")],
                wallet1.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(ok true)');
      
    name: "Ensure that a customer cannot be verified by an unapproved business",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const customer = accounts.get('wallet_1')!;
        const unapprovedBusiness = accounts.get('wallet_2')!;

        // First, add a customer
        let block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'add-customer',
                [
                    types.utf8("John Doe"),
                    types.uint(19900101),
                    types.utf8("USA")
                ],
                customer.address
            )
        ]);
        const customerId = block.receipts[0].result;

        // Attempt to verify the customer with an unapproved business
        block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'verify-customer',
                [types.uint(customerId), types.uint(1)], // Assuming business ID 1 is not approved
                unapprovedBusiness.address
            )
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(err u100)`); // err-unauthorized
    },
});

Clarinet.test({
tests
    name: "Ensure KYC level updates work correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get("deployer")!;
        const wallet1 = accounts.get("wallet_1")!;

        // Add a customer first
        let block = chain.mineBlock([
            Tx.contractCall(
                "kyc-verification",
                "add-customer",
                [
                    types.utf8("Bob"),
                    types.uint(19900101),
                    types.utf8("USA")
                ],
                wallet1.address
            )
        ]);

        // Update KYC level
        block = chain.mineBlock([
            Tx.contractCall(
                "kyc-verification",
                "update-kyc-level",
                [types.uint(1), types.uint(2)],
                deployer.address
            ),
            Tx.contractCall(
                "kyc-verification",
                "get-customer-kyc-level",
                [types.uint(1)],
                deployer.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(ok true)');
        assertEquals(block.receipts[1].result, '(some u2)');
    },
});


Clarinet.test({
    name: "Ensure business-customer linking works",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get("deployer")!;
        const wallet1 = accounts.get("wallet_1")!;

        // Setup: approve business and add customer
        let block = chain.mineBlock([
            Tx.contractCall(
                "kyc-verification",
                "approve-business",
                [
                    types.principal(wallet1.address),
                    types.utf8("KYC Corp"),
                    types.utf8("Verifier")
                ],
                deployer.address
            ),
            Tx.contractCall(
                "kyc-verification",
                "add-customer",
                [
                    types.utf8("Charlie"),
                    types.uint(19900101),
                    types.utf8("USA")
                ],
                wallet1.address
            )
        ]);

        // Link customer to business
        block = chain.mineBlock([
            Tx.contractCall(
                "kyc-verification",
                "link-customer-to-business",
                [types.uint(1), types.uint(1)],
                wallet1.address
            ),
            Tx.contractCall(
                "kyc-verification",
                "get-business-customers",
                [types.uint(1)],
                wallet1.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(ok true)');
    },
});



    name: "Ensure that a customer cannot upload a document with an existing type",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const customer = accounts.get('wallet_1')!;
        const documentType = "Passport";
        const documentHash = types.buff(new Uint8Array(32).fill(1));

        // First, add a customer
        let block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'add-customer',
                [
                    types.utf8("John Doe"),
                    types.uint(19900101),
                    types.utf8("USA")
                ],
                customer.address
            )
        ]);
        const customerId = block.receipts[0].result;

        // Upload a document
        block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'upload-customer-document',
                [
                    types.uint(customerId),
                    types.utf8(documentType),
                    documentHash
                ],
                customer.address
            )
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(ok true)`);

        // Attempt to upload the same document type again
        block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'upload-customer-document',
                [
                    types.uint(customerId),
                    types.utf8(documentType),
                    documentHash
                ],
                customer.address
            )
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(err u105)`); // err-document-already-exists
    },
});

Clarinet.test({
    name: "Ensure that a document type can be registered and deactivated by the contract owner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const documentType = "Passport";
        const requiredLevel = 1;
        const expiryBlocks = 1000;

        // Register a document type
        let block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'register-document-type',
                [
                    types.utf8(documentType),
                    types.uint(requiredLevel),
                    types.uint(expiryBlocks)
                ],
                deployer.address
            )
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(ok true)`);

        // Deactivate the document type
        block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'deactivate-document-type',
                [types.utf8(documentType)],
                deployer.address
            )
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(ok true)`);

        // Check if the document type is deactivated
        const documentTypeInfo = chain.callReadOnlyFn(
            'your-contract-name',
            'get-document-type-info',
            [types.utf8(documentType)],
            deployer.address
        );
        assertEquals(documentTypeInfo.result.expectSome().expectTuple()['is-active'], types.bool(false));
    },
});

Clarinet.test({
    name: "Ensure that a customer's verification status can be updated with history tracking",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const customer = accounts.get('wallet_1')!;
        const business = accounts.get('wallet_2')!;
        const businessName = "Tech Corp";
        const businessType = "Technology";

        // First, approve a business
        let block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'approve-business',
                [
                    types.principal(business.address),
                    types.utf8(businessName),
                    types.utf8(businessType)
                ],
                deployer.address
            )
        ]);
        const businessId = block.receipts[0].result;

        // Then, add a customer
        block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'add-customer',
                [
                    types.utf8("John Doe"),
                    types.uint(19900101),
                    types.utf8("USA")
                ],
                customer.address
            )
        ]);
        const customerId = block.receipts[0].result;

        // Update the customer's verification status
        block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'update-customer-verification',
                [
                    types.uint(customerId),
                    types.uint(businessId),
                    types.bool(true)
                ],
                business.address
            )
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(ok true)`);

        // Retrieve the verification history
        const verificationHistory = chain.callReadOnlyFn(
            'your-contract-name',
            'get-customer-verification-history',
            [types.uint(customerId)],
            deployer.address
        );
        assertEquals(verificationHistory.result.expectSome().expectList().length, 1);
    },
});

Clarinet.test({
    name: "Ensure that a customer can be linked to a business",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const customer = accounts.get('wallet_1')!;
        const business = accounts.get('wallet_2')!;
        const businessName = "Tech Corp";
        const businessType = "Technology";

        // First, approve a business
        let block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'approve-business',
                [
                    types.principal(business.address),
                    types.utf8(businessName),
                    types.utf8(businessType)
                ],
                deployer.address
            )
        ]);
        const businessId = block.receipts[0].result;

        // Then, add a customer
        block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'add-customer',
                [
                    types.utf8("John Doe"),
                    types.uint(19900101),
                    types.utf8("USA")
                ],
                customer.address
            )
        ]);
        const customerId = block.receipts[0].result;

        // Link the customer to the business
        block = chain.mineBlock([
            Tx.contractCall(
                'your-contract-name',
                'link-customer-to-business',
                [types.uint(customerId), types.uint(businessId)],
                business.address
            )
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(ok true)`);

        // Retrieve the business's customers
        const businessCustomers = chain.callReadOnlyFn(
            'your-contract-name',
            'get-business-customers',
            [types.uint(businessId)],
            deployer.address
        );
        assertEquals(businessCustomers.result.expectSome().expectList().length, 1);
    },

});
