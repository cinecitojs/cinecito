@echo off
"C:\Program Files\PostgreSQL\16\bin\psql.exe" "postgresql://postgres:postgres@localhost:5432/postgres" -c "ALTER USER postgres WITH PASSWORD 'Juanjos333';"
