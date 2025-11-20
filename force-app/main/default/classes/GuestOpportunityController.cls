public without sharing class GuestOpportunityController {

    // Writable fields only
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
        // DO NOT allow Submitted_by__c in input
    };

    /* -------------------------------------------
                CREATE OPPORTUNITY
    ------------------------------------------- */
    @AuraEnabled
    public static String createOpportunity(Map<String, Object> oppData) {
        try {
            validateRequiredFields(oppData);

            Opportunity opp = new Opportunity();
            applyFields(opp, oppData);

            // AUTO SET SUBMITTED BY
            opp.Submitted_by__c = getCurrentSiteName();

            if (opp.StageName == null) {
                opp.StageName = 'Prospecting';
            }

            insert opp;
            return opp.Id;

        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    /* -------------------------------------------
                UPDATE OPPORTUNITY
    ------------------------------------------- */
    @AuraEnabled
    public static String updateOpportunity(String oppId, Map<String, Object> oppData) {

        if (String.isBlank(oppId)) {
            throw new AuraHandledException('Opportunity Id is required');
        }

        try {
            Opportunity existing = [
                SELECT Id, Submitted_by__c
                FROM Opportunity
                WHERE Id = :oppId
                LIMIT 1
            ];

            // CROSS-SITE PROTECTION
            String siteName = getCurrentSiteName();
            if (existing.Submitted_by__c != siteName) {
                throw new AuraHandledException('You can only edit opportunities created from this site.');
            }

            Opportunity opp = new Opportunity(Id = oppId);
            applyFields(opp, oppData);

            // NEVER allow submitted_by to be overridden
            opp.Submitted_by__c = existing.Submitted_by__c;

            update opp;
            return 'Opportunity updated successfully';

        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    /* -------------------------------------------
            GET OPPORTUNITY BY ID
    ------------------------------------------- */
    @AuraEnabled(cacheable=true)
    public static Opportunity getOpportunityById(String oppId) {
        if (String.isBlank(oppId)) {
            throw new AuraHandledException('Opportunity Id is required');
        }

        Opportunity o = [
            SELECT Id, AccountId, Name, Description, StageName, Amount, Probability,
                   CloseDate, Type, Opportunity_Type__c, Channel__c, Geography__c,
                   Direct_Indirect__c, Business_Type__c, Contact_type__c, Submitted_by__c,
                   FY_Goals__c, Project_Code__c, Type_of_Engagement__c, End_Date__c, 
                   Start_Date__c, Number_of_Resources__c, Offering__c,
                   Account.Name
            FROM Opportunity
            WHERE Id = :oppId
            LIMIT 1
        ];

        // Restrict viewing across sites
        if (o.Submitted_by__c != getCurrentSiteName()) {
            throw new AuraHandledException('You do not have permission to view this record.');
        }

        return o;
    }

    /* -------------------------------------------
            GET OPPORTUNITY LIST (TABLE)
    ------------------------------------------- */
    @AuraEnabled(cacheable=true)
    public static List<Opportunity> getOpportunities() {
        try {
            String siteName = getCurrentSiteName();

            return [
                SELECT Id, Name, AccountId, Account.Name,
                       FY_Goals__c, Type, Opportunity_Type__c, Channel__c
                FROM Opportunity
                WHERE Submitted_by__c = :siteName
                ORDER BY LastModifiedDate DESC
                LIMIT 200
            ];

        } catch (Exception e) {
            throw new AuraHandledException('Unable to fetch opportunities: ' + e.getMessage());
        }
    }

    /* -------------------------------------------
                ACCOUNT LOOKUP
    ------------------------------------------- */
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getAccounts(String searchTerm) {
        String search = '%' + (searchTerm == null ? '' : searchTerm.trim()) + '%';

        List<Map<String, String>> results = new List<Map<String, String>>();
        for (Account a : [
            SELECT Id, Name 
            FROM Account
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

    /* -------------------------------------------
                PICKLISTS
    ------------------------------------------- */
    @AuraEnabled(cacheable=true)
    public static Map<String, List<String>> getOpportunityPicklistValues() {
        Map<String, List<String>> picklistMap = new Map<String, List<String>>();
        
        Map<String, Schema.SObjectField> fieldMap = Schema.SObjectType.Opportunity.fields.getMap();
            
        List<String> fieldsToGet = new List<String>{
            'StageName',
            'Type',
            'Opportunity_Type__c',
            'Channel__c',
            'Business_Type__c',
            'Geography__c',
            'Contact_type__c',
            'Direct_Indirect__c',
            'Submitted_by__c'
        };
        
        for (String fieldName : fieldsToGet) {
            if (fieldMap.containsKey(fieldName)) {
                Schema.DescribeFieldResult dr = fieldMap.get(fieldName).getDescribe();
                List<String> values = new List<String>();
                
                for (Schema.PicklistEntry entry : dr.getPicklistValues()) {
                    if (entry.isActive()) values.add(entry.getValue());
                }
                
                picklistMap.put(fieldName, values);
            }
        }

        return picklistMap;
    }

    /* -------------------------------------------
                FIELD APPLY / PARSERS
    ------------------------------------------- */
    private static void applyFields(Opportunity opp, Map<String, Object> oppData) {
        for (String fieldName : oppData.keySet()) {
            if (!ALLOWED_FIELDS.contains(fieldName)) continue;

            Object raw = oppData.get(fieldName);

            if (raw == null || String.valueOf(raw).trim() == '') {
                opp.put(fieldName, null);
                continue;
            }

            if (fieldName == 'CloseDate' || fieldName == 'Start_Date__c' || fieldName == 'End_Date__c') {
                opp.put(fieldName, coerceDate(raw));
            }
            else if (fieldName == 'Amount' || fieldName == 'Probability' || fieldName == 'Number_of_Resources__c') {
                opp.put(fieldName, coerceDecimal(raw));
            }
            else {
                opp.put(fieldName, String.valueOf(raw).trim());
            }
        }
    }

    private static Date coerceDate(Object input) {
        if (input == null) return null;
        String s = String.valueOf(input).trim();

        try { 
            return Date.valueOf(s); 
        } catch (Exception e) {}

        if (s.contains('/')) {
            List<String> p = s.split('/');
            return Date.newInstance(Integer.valueOf(p[2]), Integer.valueOf(p[1]), Integer.valueOf(p[0]));
        }

        throw new AuraHandledException('Invalid date: ' + s);
    }

    private static Decimal coerceDecimal(Object input) {
        if (input == null) return null;
        String s = String.valueOf(input).replace('%','').trim();
        if (s == '') return null;
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

    /* -------------------------------------------
                SITE NAME HELPER
    ------------------------------------------- */
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