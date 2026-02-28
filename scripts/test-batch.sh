curl -N -X POST http://localhost:3001/api/run-batch \
     -H "Content-Type: application/json" \
     -d '{"tasks": [{"taskId": "test-pdf-1", "config": {}, "file": "caso1-boleta.spec.js"}], "parallel": false}'
