public with sharing class guestAccountController {
    public guestAccountController() {



public without sharing class GuestAccountController {

    private static final List<String> ALLOWED_FIELDS = new List<String>{
        'Overall_Rating__c', 'Website', 'Fax', 'Phone', 'Direct_Indirect__c','Name'
        // Note: 'Id' is not needed in create/update payload
    };

    // ------------------------- CREATE Account -------------------------
    @AuraEnabled
    public static String createAccount(Map<String, Object> AccountData) {
        try {
            validateRequiredFields(AccountData);

            Account newCon = new Account();

            for (String field : AccountData.keySet()) {
                if (ALLOWED_FIELDS.contains(field)) {
                    Object val = AccountData.get(field);
                    if (val != null && String.valueOf(val).trim() != '') {
                        newCon.put(field, val);
                    }
                }
            }

            insert newCon;
            return newCon.Id;

        } catch (Exception e) {
            throw new AuraHandledException('Account creation failed: ' + e.getMessage());
        }
    }

    // ------------------------- UPDATE Account -------------------------
    @AuraEnabled
    public static String updateAccount(String AccountId, Map<String, Object> AccountData) {
        if (String.isBlank(AccountId)) {
            throw new AuraHandledException('Account Id is required');
        }

        try {
            Account con = [SELECT Id FROM Account WHERE Id = :AccountId LIMIT 1];

            for (String field : AccountData.keySet()) {
                if (ALLOWED_FIELDS.contains(field)) {
                    Object val = AccountData.get(field);
                    if (val != null && String.valueOf(val).trim() != '') {
                        con.put(field, val);
                    }
                }
            }

            update con;
            return 'Account updated successfully';

        } catch (QueryException qe) {
            throw new AuraHandledException('Account not found');
        } catch (Exception e) {
            throw new AuraHandledException('Unexpected error: ' + e.getMessage());
        }
    }

    // ------------------------- GET Account BY ID -------------------------
    @AuraEnabled(cacheable=true)
    public static Account getAccountById(String AccountId) {
        if (String.isBlank(AccountId)) {
            throw new AuraHandledException('Account Id is required');
        }

        try {
            return [
                SELECT Id, Overall_Rating__c, Website, Phone, Fax, Direct_Indirect__c,Name
                FROM Account
                WHERE Id = :AccountId
                LIMIT 1
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching Account: ' + e.getMessage());
        }
    }

    // ------------------------- GET ALL AccountS (DATATABLE) -------------------------
    @AuraEnabled(cacheable=true)
    public static List<Account> getAccounts() {
        try {
            return [
                 SELECT Id, Overall_Rating__c, Website, Phone, Fax, Direct_Indirect__c,Name
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
        if (String.isBlank(String.valueOf(data.get('Name')))) {
            throw new AuraHandledException('Name is required');
        }
         if (String.isBlank(String.valueOf(data.get('Direct_Indirect__c')))) {
            throw new AuraHandledException('Direct_Indirect__c is required');
        }
    }
}
        
    }
}