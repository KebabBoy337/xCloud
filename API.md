# xCloud Storage API Documentation

## Overview
xCloud Storage provides a modern file storage solution with folder support, public links, and authentication.

**Version:** 1.0.233  
**Base URL:** `https://your-domain.com`

## Authentication
All API endpoints (except health check and public links) require authentication via API key in the `X-API-Key` header.

## Endpoints

### Health Check
```
GET /api/health
```
**Description:** Check server status and API key validity  
**Authentication:** None required  
**Response:**
```json
{
  "status": "ok",
  "version": "1.0.233",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### File Management

#### List Files and Folders
```
GET /api/files
```
**Description:** Get list of files and folders in current directory  
**Authentication:** Required  
**Query Parameters:**
- `folder` (optional): Folder path to list contents of

**Response:**
```json
{
  "files": [
    {
      "name": "document.pdf",
      "displayName": "My Document.pdf",
      "size": 1024000,
      "created": "2024-01-01T00:00:00.000Z"
    }
  ],
  "folders": [
    {
      "name": "documents",
      "created": "2024-01-01T00:00:00.000Z"
    }
  ],
  "currentFolder": "documents"
}
```

#### Upload File
```
POST /api/upload
```
**Description:** Upload a file to storage  
**Authentication:** Required  
**Content-Type:** `multipart/form-data`  
**Body:**
- `file`: File to upload
- `folder` (optional): Target folder path

**Response:**
```json
{
  "message": "File uploaded successfully",
  "filename": "document.pdf",
  "folder": "documents"
}
```

#### Download File
```
GET /api/files/:filename
```
**Description:** Download a file  
**Authentication:** Required  
**Parameters:**
- `filename`: Name of file to download

**Response:** File content with appropriate headers

#### Delete File
```
DELETE /api/files/:filename
```
**Description:** Delete a file  
**Authentication:** Required  
**Parameters:**
- `filename`: Name of file to delete

**Response:**
```json
{
  "message": "File deleted successfully"
}
```

### Folder Management

#### Create Folder
```
POST /api/folders
```
**Description:** Create a new folder  
**Authentication:** Required  
**Body:**
```json
{
  "name": "folder_name"
}
```

**Response:**
```json
{
  "message": "Folder created successfully",
  "folder": "folder_name"
}
```

#### Delete Folder
```
DELETE /api/folders/:foldername
```
**Description:** Delete a folder and all its contents  
**Authentication:** Required  
**Parameters:**
- `foldername`: Name of folder to delete

**Response:**
```json
{
  "message": "Folder deleted successfully"
}
```

### Public Links

#### Make File Public
```
POST /api/files/:filename/make-public
```
**Description:** Make a file publicly accessible via permanent link  
**Authentication:** Required  
**Parameters:**
- `filename`: Name of file to make public

**Response:**
```json
{
  "message": "File is now public",
  "publicLink": "/documents/document.pdf"
}
```

#### Make File Private
```
POST /api/files/:filename/make-private
```
**Description:** Make a file private (remove public access)  
**Authentication:** Required  
**Parameters:**
- `filename`: Name of file to make private

**Response:**
```json
{
  "message": "File is now private"
}
```

#### Get Public Status
```
GET /api/files/:filename/public-status
```
**Description:** Check if a file is public or private  
**Authentication:** Required  
**Parameters:**
- `filename`: Name of file to check

**Response:**
```json
{
  "isPublic": true,
  "publicLink": "/documents/document.pdf"
}
```

### Public File Access

#### Download Public File
```
GET /:folder/:filename
GET /:filename
```
**Description:** Download a file via public link (no authentication required)  
**Authentication:** None required  
**Parameters:**
- `folder`: Folder path (URL encoded)
- `filename`: File name (URL encoded)

**Response:** File content with appropriate headers  
**Note:** Returns 403 if file is not public, 404 if file not found

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Invalid request parameters"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid API key"
}
```

### 403 Forbidden
```json
{
  "error": "File is private"
}
```

### 404 Not Found
```json
{
  "error": "File not found"
}
```

### 413 Payload Too Large
```json
{
  "error": "File too large"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Configuration

### File Size Limits
- Maximum file size: 500MB
- Supported file types: All

### Storage Structure
```
storage/
├── file1.pdf
├── file2.jpg
└── documents/
    ├── doc1.pdf
    └── images/
        └── photo.jpg
```

### Important Files
- `.public_links.json`: Stores public/private status of files
- `Important_files/`: Protected directory for configuration files

## Examples

### Upload a file to a folder
```bash
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -F "file=@document.pdf" \
  -F "folder=documents" \
  https://your-domain.com/api/upload
```

### Create a folder
```bash
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"name": "documents"}' \
  https://your-domain.com/api/folders
```

### Make a file public
```bash
curl -X POST \
  -H "X-API-Key: your-api-key" \
  https://your-domain.com/api/files/document.pdf/make-public
```

### Download a public file
```bash
curl -O https://your-domain.com/documents/document.pdf
```

## Version History

- **1.0.233** - Code cleanup, improved folder display, unified UI
- **1.0.232** - Fixed folder styling and delete modal
- **1.0.231** - Added public link management
- **1.0.230** - Added folder support
- **1.0.228** - Initial release
