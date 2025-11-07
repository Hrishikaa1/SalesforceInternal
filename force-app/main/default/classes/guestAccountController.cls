public with sharing class guestAccountController {

    // ✅ Allow-list of mutable fields
    private static final List<String> ALLOWED_FIELDS = new List<String>{
        'Overall_Rating__c',
        'Website',
        'Fax',
        'Phone',
        'Direct_Indirect__c',
        'Name'
    };

    // ------------------------- CREATE Account -------------------------
    @AuraEnabled
    public static String createAccount(Map<String, Object> accountData) {
        try {
            validateRequiredFields(accountData);

            Account acc = new Account();

            for (String fieldName : accountData.keySet()) {
                if (ALLOWED_FIELDS.contains(fieldName)) {
                    Object val = accountData.get(fieldName);
                    if (val != null && String.valueOf(val).trim() != '') {
                        acc.put(fieldName, val);
                    }
                }
            }

            insert acc;
            return acc.Id;

        } catch (Exception e) {
            // Surface a simple, controlled error back to Aura/LWC
            throw new AuraHandledException('Account creation failed: ' + e.getMessage());
        }
    }

    // ------------------------- UPDATE Account -------------------------
    @AuraEnabled
    public static String updateAccount(String accountId, Map<String, Object> accountData) {
        if (String.isBlank(accountId)) {
            throw new AuraHandledException('Account Id is required');
        }

        try {
            Account acc = [
                SELECT Id 
                FROM Account 
                WHERE Id = :accountId 
                LIMIT 1
            ];

            for (String fieldName : accountData.keySet()) {
                if (ALLOWED_FIELDS.contains(fieldName)) {
                    Object val = accountData.get(fieldName);
                    if (val != null && String.valueOf(val).trim() != '') {
                        acc.put(fieldName, val);
                    }
                }
            }

            update acc;
            return 'Account updated successfully';

        } catch (QueryException qe) {
            throw new AuraHandledException('Account not found');
        } catch (Exception e) {
            throw new AuraHandledException('Unexpected error: ' + e.getMessage());
        }
    }

    // ------------------------- GET Account BY ID -------------------------
    @AuraEnabled(cacheable=true)
    public static Account getAccountById(String accountId) {
        if (String.isBlank(accountId)) {
            throw new AuraHandledException('Account Id is required');
        }

        try {
            return [
                SELECT Id, Overall_Rating__c, Website, Phone, Fax, Direct_Indirect__c, Name
                FROM Account
                WHERE Id = :accountId
                LIMIT 1
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching Account: ' + e.getMessage());
        }
    }

    // ------------------------- GET ALL Accounts (DATATABLE) -------------------------
    @AuraEnabled(cacheable=true)
    public static List<Account> getAccounts() {
        try {
            return [
                SELECT Id, Overall_Rating__c, Website, Phone, Fax, Direct_Indirect__c, Name
                FROM Account
                ORDER BY CreatedDate DESC
                LIMIT 200
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving Accounts: ' + e.getMessage());
        }
    }

    // ------------------------- VALIDATION -------------------------
    private static void validateRequiredFields(Map<String, Object> data) {
        // Name
        Object nameVal = data != null ? data.get('Name') : null;
        if (nameVal == null || String.isBlank(String.valueOf(nameVal))) {
            throw new AuraHandledException('Name is required');
        }

        // Direct_Indirect__c
        Object dirIndVal = data.get('Direct_Indirect__c');
        if (dirIndVal == null || String.isBlank(String.valueOf(dirIndVal))) {
            throw new AuraHandledException('Direct_Indirect__c is required');
        }
    }
}
