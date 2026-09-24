from app.services.domain_statistics import statistics
def get_statistics_dashboard(user):return statistics(user)
def get_overview_statistics(user):return {'success':True,'data':statistics(user)['data']['overview']}
def get_monthly_billing_trend(user):return {'success':True,'data':statistics(user,['INVOICE'])['data']['billingTrend']}
def get_billing_insight(user):return {'success':True,'data':statistics(user,['INVOICE'])['data']['billingInsight']}
