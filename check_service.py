import requests
import sys

def main():
    print("Checking microservice health...")
    try:
        response = requests.get("http://localhost:8000/health")
        data = response.json()
        
        status = data.get("status")
        if status == "ok":
            print("✅ Microservice is fully operational!")
        else:
            print("❌ Microservice has issues!")
            
        print("\nComponent Status:")
        components = data.get("components", {})
        
        db_status = components.get("database", "unknown")
        print(f"  Database : {'✅' if db_status == 'connected' else '❌'} {db_status}")
        
        redis_status = components.get("redis", "unknown")
        print(f"  Redis    : {'✅' if redis_status == 'connected' else '❌'} {redis_status}")
        
        kafka_status = components.get("kafka", "unknown")
        print(f"  Kafka    : {'✅' if kafka_status == 'connected' else '❌'} {kafka_status}")
        
        if status != "ok":
            sys.exit(1)
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to the microservice! Is it running? (Try running ./start.sh or uvicorn app.main:app)")
        sys.exit(1)
    except Exception as e:
        print(f"❌ An error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
