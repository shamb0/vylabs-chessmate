"""
ChessMate Cognitive Service - Create Vectorizer (Robust Version)

This script connects to the database and creates the pgai vectorizer idempotently.
It includes schema introspection to find the correct vectorizer metadata table.
"""
import os
import psycopg2
import structlog

log = structlog.get_logger("create_vectorizer")

def introspect_ai_schema(cur):
    """Introspect the ai schema to find vectorizer-related tables/views"""
    log.info("Introspecting ai schema...")
    
    # Check what tables exist in ai schema
    cur.execute("""
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'ai' 
        AND tablename LIKE '%vectorizer%'
        ORDER BY tablename;
    """)
    tables = [row[0] for row in cur.fetchall()]
    
    # Check what views exist in ai schema
    cur.execute("""
        SELECT viewname 
        FROM pg_views 
        WHERE schemaname = 'ai' 
        AND viewname LIKE '%vectorizer%'
        ORDER BY viewname;
    """)
    views = [row[0] for row in cur.fetchall()]
    
    log.info("Found vectorizer-related objects", tables=tables, views=views)
    return tables, views

def find_vectorizer_by_name(cur, vectorizer_name):
    """Try different approaches to find a vectorizer by name"""
    
    # Try common table/view names
    possible_tables = ['vectorizer', 'vectorizers', 'vectorizer_config', 'vectorizer_configurations']
    
    for table_name in possible_tables:
        try:
            log.info(f"Trying to query ai.{table_name}...")
            cur.execute(f"SELECT id FROM ai.{table_name} WHERE name = %s LIMIT 1;", (vectorizer_name,))
            result = cur.fetchone()
            if result:
                log.info(f"Found vectorizer in ai.{table_name}", vectorizer_id=result[0])
                return result[0]
        except psycopg2.Error as e:
            log.debug(f"ai.{table_name} not accessible", error=str(e))
            continue
    
    return None

def drop_vectorizer_by_id(cur, vectorizer_id):
    """Drop vectorizer using its ID"""
    try:
        log.info("Attempting to drop vectorizer by ID", vectorizer_id=vectorizer_id)
        cur.execute("SELECT ai.drop_vectorizer(%s, drop_all => true);", (vectorizer_id,))
        log.info("Successfully dropped vectorizer", vectorizer_id=vectorizer_id)
        return True
    except psycopg2.Error as e:
        log.error("Failed to drop vectorizer by ID", vectorizer_id=vectorizer_id, error=str(e))
        return False

def try_drop_vectorizer_by_name(cur, vectorizer_name):
    """Try dropping vectorizer directly by name"""
    try:
        log.info("Attempting to drop vectorizer by name", name=vectorizer_name)
        cur.execute("SELECT ai.drop_vectorizer(%s);", (vectorizer_name,))
        log.info("Successfully dropped vectorizer by name", name=vectorizer_name)
        return True
    except psycopg2.Error as e:
        log.debug("Failed to drop vectorizer by name", name=vectorizer_name, error=str(e))
        return False

def create_vectorizer():
    db_url = os.environ.get("POSTGRES_URL")
    if not db_url:
        raise ValueError("POSTGRES_URL environment variable not set.")

    try:
        log.info("Connecting to the database...")
        with psycopg2.connect(db_url) as conn:
            with conn.cursor() as cur:
                log.info("Checking for prepared_chess_knowledge table...")
                cur.execute("SELECT to_regclass('public.prepared_chess_knowledge')")
                if cur.fetchone()[0] is None:
                    log.error("FATAL: Table 'prepared_chess_knowledge' does not exist. Run dbt transform first.")
                    return

                # Introspect the schema first
                tables, views = introspect_ai_schema(cur)
                
                log.info("Cleaning up old vectorizer objects...")
                vectorizer_name = 'prepared_chess_knowledge_vectorizer'
                dropped = False
                
                # Strategy 1: Try dropping by name directly
                if try_drop_vectorizer_by_name(cur, vectorizer_name):
                    dropped = True
                else:
                    # Strategy 2: Find by ID and drop
                    vectorizer_id = find_vectorizer_by_name(cur, vectorizer_name)
                    if vectorizer_id:
                        dropped = drop_vectorizer_by_id(cur, vectorizer_id)
                
                if not dropped:
                    log.info("No existing vectorizer found to drop, or unable to drop. Proceeding with creation.")

                log.info("Creating vectorizer for prepared_chess_knowledge...")
                vectorizer_sql = """
                SELECT ai.create_vectorizer(
                    'prepared_chess_knowledge'::regclass,
                    name => 'prepared_chess_knowledge_vectorizer',
                    loading => ai.loading_column('content'),
                    embedding => ai.embedding_ollama('nomic-embed-text', 768),
                    destination => ai.destination_table(
                        target_table => 'prepared_chess_knowledge_embeddings_store',
                        view_name => 'prepared_chess_knowledge_embeddings'
                    )
                );
                """
                cur.execute(vectorizer_sql)
                log.info("Vectorizer creation command executed successfully.")
                
    except psycopg2.Error as e:
        log.error("Database operation failed.", error=str(e))
        raise

if __name__ == "__main__":
    create_vectorizer()