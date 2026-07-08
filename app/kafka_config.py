import os

def get_kafka_config(group_id=None):
    bootstrap_servers = os.getenv("KAFKA_URL", "localhost:9092")
    
    config = {
        'bootstrap.servers': bootstrap_servers,
    }
    
    # If using Upstash Kafka, it requires SASL/SCRAM
    username = os.getenv("KAFKA_USERNAME")
    password = os.getenv("KAFKA_PASSWORD")
    
    if username and password:
        config['security.protocol'] = 'SASL_SSL'
        config['sasl.mechanisms'] = 'SCRAM-SHA-256'
        config['sasl.username'] = username
        config['sasl.password'] = password
        
    if group_id:
        config['group.id'] = group_id
        config['auto.offset.reset'] = 'earliest'
        
    return config
