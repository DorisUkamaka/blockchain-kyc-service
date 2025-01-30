
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
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
