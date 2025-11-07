public without sharing class GuestOpportunityController {

    // Writable fields only (no relationship display fields, no duplicates)
    private static final Set<String> ALLOWED_FIELDS = new Set<String>{
        'AccountId',
        'Name',
        'Description',
        'StageName',
        'Amount',
        'Probability',
        'CloseDate',
        'Type',
        'Opportunity_Type__c',
        'Channel__c',
        'Geography__c',
        'Direct_Indirect__c',
        'Business_Type__c',
        'Contact_type__c',
        'FY_Goals__c',
        'Project_Code__c',
        'Type_of_Engagement__c',
        'End_Date__c',
        'Start_Date__c',
        'Number_of_Resources__c',
        'Offering__c'
    };

    // ---------------- CREATE ----------------
    @AuraEnabled
    public static String createOpportunity(Map<String, Object> oppData) {
        validateRequiredFields(oppData);

        Opportunity opp = new Opportunity();
        applyFields(opp, oppData);

        if (opp.StageName == null) {
            opp.StageName = 'Prospecting';
        }

        try {
            insert opp;
            return opp.Id;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
    }

    // ---------------- UPDATE ----------------
    @AuraEnabled
    public static String updateOpportunity(String oppId, Map<String, Object> oppData) {
        if (String.isBlank(oppId)) {
            throw new AuraHandledException('Opportunity Id is required');
        }

        Opportunity opp = new Opportunity(Id = oppId);
        applyFields(opp, oppData);

        try {
            update opp;
            return 'Opportunity updated successfully';
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
    }

    // ---------------- GET BY ID ----------------
    @AuraEnabled(cacheable=true)
    public static Opportunity getOpportunityById(String oppId) {
        if (String.isBlank(oppId)) {
            throw new AuraHandledException('Opportunity Id is required');
        }

        return [
            SELECT Id, AccountId, Name, Description, StageName, Amount, Probability,
                   CloseDate, Type, Opportunity_Type__c, Channel__c, Geography__c,
                   Direct_Indirect__c, Business_Type__c, Contact_type__c, FY_Goals__c,
                   Project_Code__c, Type_of_Engagement__c, End_Date__c, Start_Date__c,
                   Number_of_Resources__c, Offering__c,
                   Account.Name,
                   Owner.Name
            FROM Opportunity
            WHERE Id = :oppId
            LIMIT 1
        ];
    }

    // ---------------- ACCOUNT LOOKUP SUPPORT ----------------
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getAccounts(String searchTerm) {
        String search = '%' + (searchTerm == null ? '' : searchTerm.trim()) + '%';

        List<Map<String, String>> results = new List<Map<String, String>>();
        for (Account a : [
            SELECT Id, Name FROM Account
            WHERE Name LIKE :search
            LIMIT 10
        ]) {
            results.add(new Map<String, String>{
                'value' => a.Id,
                'label' => a.Name
            });
        }
        return results;
    }

    // ---------------- LIST (for Datatable) ----------------
@AuraEnabled(cacheable=true)
public static List<Opportunity> getOpportunities() {
    try {
        return [
            SELECT Id,
                   Name,
                   AccountId,
                   Account.Name,
                   FY_Goals__c,
                   FY_Goals__r.Name,
                   Type,
                   Opportunity_Type__c,
                   Channel__c
            FROM Opportunity
            ORDER BY LastModifiedDate DESC
            LIMIT 10
        ];
    } catch (Exception e) {
        throw new AuraHandledException('Unable to fetch opportunities: ' + e.getMessage());
    }
}

    // ---------------- HELPERS ----------------

    private static void applyFields(Opportunity opp, Map<String, Object> oppData) {
        for (String fieldName : oppData.keySet()) {
            if (!ALLOWED_FIELDS.contains(fieldName)) continue;

            Object raw = oppData.get(fieldName);
            if (raw == null) {
                opp.put(fieldName, null);
                continue;
            }

            // Date conversion
            if (fieldName == 'CloseDate' || fieldName == 'Start_Date__c' || fieldName == 'End_Date__c') {
                opp.put(fieldName, coerceDate(raw));
            }
            // Numeric conversion
            else if (fieldName == 'Amount' || fieldName == 'Probability' || fieldName == 'Number_of_Resources__c') {
                opp.put(fieldName, coerceDecimal(raw));
            }
            // Everything else
            else {
                opp.put(fieldName, String.valueOf(raw).trim());
            }
        }
    }

    private static Date coerceDate(Object input) {
        if (input == null) return null;
        String s = String.valueOf(input).trim();

        try { return Date.valueOf(s); } catch (Exception e) {}

        if (s.contains('/')) {
            List<String> p = s.split('/');
            return Date.newInstance(Integer.valueOf(p[2]), Integer.valueOf(p[1]), Integer.valueOf(p[0]));
        }

        throw new AuraHandledException('Invalid date format: ' + s);
    }

    private static Decimal coerceDecimal(Object input) {
        if (input == null) return null;
        String s = String.valueOf(input).replace('%','').trim();
        return Decimal.valueOf(s);
    }

    private static void validateRequiredFields(Map<String, Object> oppData) {
        if (String.isBlank((String)oppData.get('Name'))) {
            throw new AuraHandledException('Opportunity Name is required');
        }
        if (String.isBlank(String.valueOf(oppData.get('CloseDate')))) {
            throw new AuraHandledException('Close Date is required');
        }
        if (String.isBlank((String)oppData.get('StageName'))) {
            throw new AuraHandledException('Stage Name is required');
        }
    }
}
