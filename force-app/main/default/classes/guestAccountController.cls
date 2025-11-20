public without sharing class GuestAccountController {

    // ------------------------- ALLOWED FIELDS -------------------------
    private static final List<String> ALLOWED_FIELDS = new List<String>{
        'Name',
        'Direct_Indirect__c',
        'Phone',
        'Website',
        'Fax',
        'Submitted_by__c'
    };

    // ------------------------- CREATE ACCOUNT -------------------------
    @AuraEnabled
    public static String createAccount(Map<String, Object> accountData) {
        try {
            validateRequiredFields(accountData);

            Account newAcc = new Account();

            // Set all allowed fields including Submitted_by__c
            for (String field : accountData.keySet()) {
                if (ALLOWED_FIELDS.contains(field)) {
                    Object val = accountData.get(field);
                    if (val != null && String.valueOf(val).trim() != '') {
                        newAcc.put(field, val);
                    }
                }
            }

            insert newAcc;
            return newAcc.Id;

        } catch (Exception e) {
            throw new AuraHandledException('Account creation failed: ' + e.getMessage());
        }
    }

    // ------------------------- UPDATE ACCOUNT -------------------------
    @AuraEnabled
    public static String updateAccount(String accountId, Map<String, Object> accountData) {
        if (String.isBlank(accountId)) {
            throw new AuraHandledException('Account Id is required');
        }

        try {
            Account acc = [
                SELECT Id, Submitted_by__c
                FROM Account
                WHERE Id = :accountId
                LIMIT 1
            ];

            // 🔥 Block cross-site edits
            String siteName = getCurrentSiteName();
            if (acc.Submitted_by__c != siteName) {
                throw new AuraHandledException('You can only edit records submitted from this site.');
            }

            for (String field : accountData.keySet()) {
                if (ALLOWED_FIELDS.contains(field)) {
                    Object val = accountData.get(field);

                    if (val != null && String.valueOf(val).trim() != '') {
                        acc.put(field, val);
                    } else {
                        acc.put(field, null);
                    }
                }
            }

            update acc;
            return 'Account updated successfully';

        } catch (Exception e) {
            throw new AuraHandledException('Unexpected error: ' + e.getMessage());
        }
    }

    // ------------------------- GET ACCOUNT BY ID -------------------------
    @AuraEnabled(cacheable=true)
    public static Account getAccountById(String accountId) {
        if (String.isBlank(accountId)) {
            throw new AuraHandledException('Account Id is required');
        }

        try {
            Account a = [
                SELECT Id, Name, Direct_Indirect__c, Phone, Website, Fax, Submitted_by__c
                FROM Account
                WHERE Id = :accountId
                LIMIT 1
            ];

            // 🔥 Prevent viewing other site's records
            String siteName = getCurrentSiteName();
            if (a.Submitted_by__c != siteName) {
                throw new AuraHandledException('You do not have permission to view this record.');
            }

            return a;

        } catch (Exception e) {
            throw new AuraHandledException('Error fetching Account: ' + e.getMessage());
        }
    }

    // ------------------------- GET ACCOUNT LIST (SITE FILTERED) -------------------------
    @AuraEnabled(cacheable=true)
    public static List<Account> getAccounts() {
        try {
            String siteName = getCurrentSiteName();

            return [
                SELECT Id, Name, Website, Fax, Phone, Direct_Indirect__c, Submitted_by__c
                FROM Account
                WHERE Submitted_by__c = :siteName
                ORDER BY CreatedDate DESC
                LIMIT 200
            ];

        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving accounts: ' + e.getMessage());
        }
    }

    // ------------------------- GET PICKLIST VALUES -------------------------
    @AuraEnabled(cacheable=true)
    public static Map<String, List<String>> getAccountPicklistValues() {
        Map<String, List<String>> picklistMap = new Map<String, List<String>>();

        try {
            // Get Direct_Indirect__c picklist values
            Schema.DescribeFieldResult directIndirectField = Account.Direct_Indirect__c.getDescribe();
            List<String> directIndirectValues = new List<String>();
            for (Schema.PicklistEntry entry : directIndirectField.getPicklistValues()) {
                if (entry.isActive()) directIndirectValues.add(entry.getValue());
            }
            picklistMap.put('Direct_Indirect__c', directIndirectValues);

            // Get Submitted_by__c picklist values
            Schema.DescribeFieldResult submittedByField = Account.Submitted_by__c.getDescribe();
            List<String> submittedByValues = new List<String>();
            for (Schema.PicklistEntry entry : submittedByField.getPicklistValues()) {
                if (entry.isActive()) submittedByValues.add(entry.getValue());
            }
            picklistMap.put('Submitted_by__c', submittedByValues);

        } catch (Exception e) {
            System.debug('Error getting picklist values: ' + e.getMessage());
        }

        return picklistMap;
    }

    // ------------------------- REQUIRED FIELD VALIDATION -------------------------
    private static void validateRequiredFields(Map<String, Object> data) {
        if (String.isBlank(String.valueOf(data.get('Name')))) {
            throw new AuraHandledException('Account Name is required');
        }
        if (String.isBlank(String.valueOf(data.get('Direct_Indirect__c')))) {
            throw new AuraHandledException('Direct/Indirect is required');
        }
    }

    // ------------------------- SITE NAME HELPER (SAME AS LEAD CONTROLLER) -------------------------
    private static String currentSiteName;
    private static String getCurrentSiteName() {
        if (currentSiteName != null) return currentSiteName;

        try {
            Id netId = Network.getNetworkId();
            if (netId != null) {
                Network n = [
                    SELECT Id, Name
                    FROM Network
                    WHERE Id = :netId
                    LIMIT 1
                ];
                currentSiteName = n.Name;
            } else {
                currentSiteName = 'Default Site';
            }
        } catch (Exception ex) {
            currentSiteName = 'Default Site';
        }

        return currentSiteName;
    }
}