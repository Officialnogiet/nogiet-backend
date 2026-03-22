# CarbonMapper API Integration Documentation

## Overview

The NOGIET portal integrates with CarbonMapper's Data Platform API to retrieve satellite-based methane (CH4) and carbon dioxide (CO2) emission data. CarbonMapper provides geospatially-oriented emissions data including plume detections and source catalogs.

**Base URL:** `https://api.carbonmapper.org/api/v1`
**API Docs:** `https://api.carbonmapper.org/api/v1/docs`
**STAC API:** `https://api.carbonmapper.org/api/v1/stac/`

---

## Authentication

CarbonMapper uses JWT token-based authentication.

### Obtain Token

```
POST /api/v1/token/pair
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "refresh": "string",
  "access": "string",
  "groups": "string",
  "permissions": ["string"]
}
```

### Refresh Token

```
POST /api/v1/token/refresh
Content-Type: application/json

{
  "refresh": "string"
}
```

**Response (200):**
```json
{
  "refresh": "string",
  "access": "string"
}
```

### Verify Token

```
POST /api/v1/token/verify
Content-Type: application/json

{
  "token": "string"
}
```

---

## Catalog Endpoints

### List Sources

Retrieves emission sources matching filter criteria.

```
GET /api/v1/catalog/sources
Authorization: Bearer <access_token>
```

**Query Parameters:**

| Parameter        | Type   | Description                                |
|------------------|--------|--------------------------------------------|
| `plume_gas`      | string | Gas type filter: `CH4` or `CO2`            |
| `sector`         | string | Sector filter (e.g., `1B2`, `6A`)          |
| `instrument`     | string | Instrument filter (e.g., `emit`, `aviris`) |
| `bbox`           | string | Bounding box: `min_lon,min_lat,max_lon,max_lat` |
| `datetime_start` | string | Start date (ISO 8601)                      |
| `datetime_end`   | string | End date (ISO 8601)                        |
| `emission_min`   | number | Minimum emission rate (kg/hr)              |
| `emission_max`   | number | Maximum emission rate (kg/hr)              |
| `plume_count_min`| number | Minimum number of plumes                   |
| `plume_count_max`| number | Maximum number of plumes                   |
| `persistence_min`| number | Minimum source persistence (0-100)         |
| `persistence_max`| number | Maximum source persistence (0-100)         |
| `limit`          | number | Results per page (default: 20)             |
| `offset`         | number | Pagination offset                          |

**Response (200):**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [longitude, latitude]
      },
      "properties": {
        "source_name": "string",
        "sector": "string",
        "gas": "CH4",
        "emission_rate": 2450.0,
        "persistence": 13.0,
        "plume_count": 5,
        "instrument": "emit",
        "first_detected": "2024-01-15T00:00:00Z",
        "last_detected": "2024-06-20T00:00:00Z"
      }
    }
  ],
  "total": 1234
}
```

### List Plumes

Retrieves individual plume detections for a given source.

```
GET /api/v1/catalog/plumes
Authorization: Bearer <access_token>
```

**Query Parameters:**

| Parameter     | Type   | Description                          |
|---------------|--------|--------------------------------------|
| `source_name` | string | Source identifier                    |
| `plume_gas`   | string | Gas type: `CH4` or `CO2`            |
| `limit`       | number | Results per page                     |
| `offset`      | number | Pagination offset                    |

**Response (200):**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [longitude, latitude]
      },
      "properties": {
        "plume_id": "string",
        "source_name": "string",
        "emission_rate": 1850.0,
        "gas": "CH4",
        "instrument": "emit",
        "datetime": "2024-03-15T10:30:00Z",
        "scene_id": "string"
      }
    }
  ]
}
```

---

## STAC API

CarbonMapper also provides a STAC (SpatioTemporal Asset Catalog) API.

### Get Catalog Root

```
GET /api/v1/stac/
```

### Get Collections

```
GET /api/v1/stac/collections
```

### Search STAC Items

```
POST /api/v1/stac/search
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "bbox": [min_lon, min_lat, max_lon, max_lat],
  "datetime": "2024-01-01T00:00:00Z/2024-12-31T23:59:59Z",
  "collections": ["collection-name"],
  "limit": 50
}
```

---

## Geospatial Services

### Create AOI (Area of Interest)

```
POST /api/v1/account/search-request
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "aoi_id": "uuid",
  "name": "string",
  "query": {},
  "change_detection_enabled": true,
  "change_detection_schedule": "Daily"
}
```

---

## Sector Codes

| Code | Sector Description   |
|------|----------------------|
| 1B2  | Oil and Gas          |
| 1B1  | Coal Mining          |
| 6A   | Waste Management     |
| 3    | Agriculture          |
| 1A   | Power Plants         |

---

## Instruments

| Instrument      | Provider        |
|-----------------|-----------------|
| `emit`          | NASA EMIT       |
| `aviris-ng`     | NASA AVIRIS-NG  |
| `aviris-3`      | NASA AVIRIS-3   |
| `gao`           | ASU GAO         |
| `tanager`       | Planet Tanager  |
| `emu`           | EMU             |

---

## Rate Limits & Usage

- CarbonMapper implements rate limiting to keep the API responsive.
- Data is freely available for **non-commercial research** purposes.
- Attribution to Carbon Mapper is required when using their data.
- See [Terms of Use](https://carbonmapper.org/terms) for full details.

---

## Data Used by NOGIET

The NOGIET portal consumes the following from CarbonMapper:

1. **Source Catalog** - Emission source locations in Nigeria (filtered by bbox around Nigeria: `2.67,4.27,14.68,13.89`)
2. **Plume Data** - Individual plume detections per source for emission history charts
3. **STAC Search** - Geospatial asset discovery for RGB imagery overlays
4. **Source Details** - Per-source metadata including emission rate, gas type, instrument, and persistence

All CarbonMapper data is cached on the backend for 5 minutes to minimize API calls and respect rate limits.
