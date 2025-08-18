const { MongoClient, ObjectId } = require("mongodb");

// MongoDB 연결 URI와 데이터베이스 이름 설정
const uri =
  "mongodb+srv://admin:kmcp123!@kmcp.7zws0.mongodb.net/?retryWrites=true&w=majority&appName=KMCP";

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function insertAndModifyData() {
  try {
    await client.connect();
    console.log("Connected to database");

    const db = client.db("KMCP-2");

    // 샘플 데이터
    const data = {
      ships: [
        {
          ship_info: {
            name: "EL-KUS",
            ship_id: "eletric-01",
            type: "fishing",
            max_passenger: 8,
            docked: false,
            maintenance: false,
            total_operation_rate: "80",
            idle_time: false,
          },
          location: {
            current_location: {
              latitude: 35.1786125,
              longitude: 129.1997133,
            },
            utc_time: "09:00",
            sog: 15,
            cog: 120,
            heading: 120,
            route: [{ latitude: 36.1786125, longitude: 130.1997133 }],
          },
          sea_objects: [
            {
              x1: 30,
              y1: 30,
              x2: 60,
              y2: 60,
            },
          ],
          sonar: {
            depth: 3,
          },
          bilge_pumps: [
            {
              status: false,
              water_level: 0.5,
            },
          ],
          radar: {
            obstacles: [
              {
                obstacle: false,
                identification: null,
                distance: null,
                direction: null,
                speed: null,
                status: true,
              },
            ],
          },
          internal_temperature: {
            1: 22,
            2: 24,
          },
          lighting_system: {
            1: false,
            2: false,
          },
          propulsion_system: {
            oil_press: 50,
            rudder_angle: {
              1: 36,
              2: null,
            },
            cool_temp: {
              1: 60,
              2: null,
            },
            fuel_level: {
              1: 50,
              2: null,
            },
            engines: [
              {
                engine_type: "eletric",
                engine_speed: 2000,
                engine_runtime: 3600,
                engine_temp: 180,
                fuel_efficiency: 3,
              },
            ],
            batteries: [
              {
                battery_type: "torqeedo-electric",
                battery_life: 85,
                battery_volt: 12,
              },
            ],
          },
        },
      ],
    };

    const shipData = data.ships[0];
    const shipId = shipData.ship_info.ship_id;

    const shipsCollection = db.collection("ships");
    const locationsCollection = db.collection("locations");
    const seaObjectsCollection = db.collection("marine_objects");
    const sonarCollection = db.collection("sonar");
    const bilgePumpsCollection = db.collection("bilge_pumps");
    const radarCollection = db.collection("radar");
    const internalTemperatureCollection = db.collection("internal_temperature");
    const lightingSystemCollection = db.collection("lighting_system");
    const propulsionSystemCollection = db.collection("propulsion_systems");

    // null인 값 제거
    function removeNulls(obj) {
      return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v != null)
      );
    }

    // 선박 정보 삽입
    await shipsCollection.insertOne(removeNulls(shipData.ship_info));

    // 위치 정보 삽입
    await locationsCollection.insertOne({
      ...removeNulls(shipData.location),
      ship_id: shipId,
    });

    // 해상 객체 데이터 삽입
    await seaObjectsCollection.insertMany(
      shipData.sea_objects.map((obj) => ({
        ...removeNulls(obj),
        ship_id: shipId,
      }))
    );

    // 소나 정보 삽입
    await sonarCollection.insertOne({
      ...removeNulls(shipData.sonar),
      ship_id: shipId,
    });

    // 빌지 펌프 정보 삽입
    await bilgePumpsCollection.insertMany(
      shipData.bilge_pumps.map((pump) => ({
        ...removeNulls(pump),
        ship_id: shipId,
      }))
    );

    // 레이더 정보 삽입
    await radarCollection.insertOne({
      ...removeNulls(shipData.radar),
      ship_id: shipId,
    });

    // 내부 온도 정보 삽입
    await internalTemperatureCollection.insertOne({
      ...removeNulls(shipData.internal_temperature),
      ship_id: shipId,
    });

    // 조명 시스템 정보 삽입
    await lightingSystemCollection.insertOne({
      ...removeNulls(shipData.lighting_system),
      ship_id: shipId,
    });

    // 추진 시스템 정보 삽입
    await propulsionSystemCollection.insertOne({
      ...removeNulls(shipData.propulsion_system),
      ship_id: shipId,
    });

    console.log("Initial data inserted successfully");

    // 반복 작업 함수
    function modifyNumericFields(obj) {
      for (let key in obj) {
        if (typeof obj[key] === "number") {
          obj[key] += Math.random() < 0.5 ? 1 : -1;
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          modifyNumericFields(obj[key]);
        }
      }
    }

    // 주기적 데이터 수정 및 삽입
    setInterval(async () => {
      modifyNumericFields(shipData.location);
      modifyNumericFields(shipData.sea_objects);
      modifyNumericFields(shipData.sonar);
      modifyNumericFields(shipData.bilge_pumps);
      modifyNumericFields(shipData.radar);
      modifyNumericFields(shipData.internal_temperature);
      modifyNumericFields(shipData.lighting_system);
      modifyNumericFields(shipData.propulsion_system);

      await locationsCollection.insertOne({
        ...removeNulls(shipData.location),
        ship_id: shipId,
      });
      await seaObjectsCollection.insertMany(
        shipData.sea_objects.map((obj) => ({
          ...removeNulls(obj),
          ship_id: shipId,
        }))
      );
      await sonarCollection.insertOne({
        ...removeNulls(shipData.sonar),
        ship_id: shipId,
      });
      await bilgePumpsCollection.insertMany(
        shipData.bilge_pumps.map((pump) => ({
          ...removeNulls(pump),
          ship_id: shipId,
        }))
      );
      await radarCollection.insertOne({
        ...removeNulls(shipData.radar),
        ship_id: shipId,
      });
      await internalTemperatureCollection.insertOne({
        ...removeNulls(shipData.internal_temperature),
        ship_id: shipId,
      });
      await lightingSystemCollection.insertOne({
        ...removeNulls(shipData.lighting_system),
        ship_id: shipId,
      });
      await propulsionSystemCollection.insertOne({
        ...removeNulls(shipData.propulsion_system),
        ship_id: shipId,
      });

      console.log("Data updated successfully");
    }, 500); // 0.5초마다 실행
  } finally {
    // 클라이언트 연결은 수동으로 종료합니다. (setInterval이 계속 실행되기 때문)
  }
}

insertAndModifyData().catch(console.dir);
