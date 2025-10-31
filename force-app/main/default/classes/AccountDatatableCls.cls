public without sharing class AccountDatatableCls {
    @AuraEnabled(cacheable=true)
    public static List<Lead> MethodForAcc() {
        return [Select Id, Phone, Company, Industry, Rating from Lead Limit 5];
    }
}