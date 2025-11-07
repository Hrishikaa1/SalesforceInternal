public without sharing class guestAccountController {

    // Allow-list of writable fields
    private static final Set<String> ALLOWED_FIELDS = new Set<String>{
        'Name',
        'Overall_Rating__c',
        'Website',
        'Phone',
        'Fax',
        'Direct_Indirect__c'
    };

    // ----------------- CREATE -----------------
    @AuraEnabled
    public static String createAccount(Map<String, Object> accountData) {
        validateRequired(accountData);

        Account acc = new Account();
        upsertFields(acc, accountData);
        try {
            insert acc;
            return acc.Id;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
    }

    // ----------------- UPDATE -----------------
    @AuraEnabled
    public static String updateAccount(String accountId, Map<String, Object> accountData) {
        if (String.isBlank(accountId)) {
            throw new AuraHandledException('Account Id is required');
        }
        Account acc = new Account(Id = accountId);
        upsertFields(acc, accountData);
        try {
            update acc;
            return 'Account updated';
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
    }

    // ----------------- GET BY ID -----------------
    @AuraEnabled(cacheable=true)
    public static Account getAccountById(String accountId) {
        if (String.isBlank(accountId)) {
            throw new AuraHandledException('Account Id is required');
        }
        return [
            SELECT Id, Name, Overall_Rating__c, Website, Phone, Fax, Direct_Indirect__c
            FROM Account
            WHERE Id = :accountId
            LIMIT 1
        ];
    }

    // ----------------- LIST (DATATABLE) -----------------
    @AuraEnabled(cacheable=true)
    public static List<Account> getAccounts() {
        return [
            SELECT Id, Name, Overall_Rating__c, Website, Phone, Fax, Direct_Indirect__c
            FROM Account
            ORDER BY CreatedDate DESC
            LIMIT 200
        ];
    }

    // ----------------- HELPERS -----------------
    private static void upsertFields(SObject s, Map<String, Object> data) {
        if (data == null) return;
        for (String f : data.keySet()) {
            if (!ALLOWED_FIELDS.contains(f)) continue;
            Object v = data.get(f);
            s.put(f, (v == null || String.valueOf(v).trim() == '') ? null : v);
        }
    }

    private static void validateRequired(Map<String, Object> data) {
        if (data == null) throw new AuraHandledException('Payload empty');
        if (String.isBlank(String.valueOf(data.get('Name')))) {
            throw new AuraHandledException('Name is required');
        }
        if (String.isBlank(String.valueOf(data.get('Direct_Indirect__c')))) {
            throw new AuraHandledException('Direct/Indirect is required');
        }
    }
}
