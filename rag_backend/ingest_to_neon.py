import os
import sys
from pathlib import Path

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Override DB settings for Neon
from app.config import settings
settings.DB_HOST = "ep-falling-lab-ay2wznkb-pooler.c-5.us-east-2.aws.neon.tech"
settings.DB_PORT = 5432
settings.DB_USER = "neondb_owner"
settings.DB_PASSWORD = "npg_8EVfeHrT1sLW"
settings.DB_NAME = "neondb"
settings.DB_SSLMODE = "require"

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from clear_db import clear_knowledge_base
from app.services.rag_service import insert_knowledge_document

def ingest_to_neon():
    print(f"Connecting to Cloud Neon DB on {settings.DB_HOST}...")
    clear_knowledge_base()
    
    data_dir = Path("data/pdfs")
    if not data_dir.exists():
        print(f"Directory {data_dir} does not exist.")
        return

    pdf_files = list(data_dir.glob("*.pdf"))
    if not pdf_files:
        print(f"No PDF files found in {data_dir}.")
        return

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
        is_separator_regex=False,
    )

    total_chunks = 0
    for pdf_file in pdf_files:
        print(f"Processing {pdf_file.name}...")
        try:
            loader = PyPDFLoader(str(pdf_file))
            pages = loader.load()
            chunks = text_splitter.split_documents(pages)
            
            for chunk in chunks:
                content = chunk.page_content
                source = f"{pdf_file.name} (Page {chunk.metadata.get('page', 'unknown')})"
                title = pdf_file.name.replace(".pdf", "").replace("_", " ").replace("-", " ").title()
                
                insert_knowledge_document(
                    user_id=None,
                    title=title,
                    content=content,
                    source=source,
                    category="Curated Knowledge",
                    tags=["pdf_import"]
                )
                total_chunks += 1
            print(f"Finished {pdf_file.name}. Generated {len(chunks)} chunks.")
        except Exception as e:
            print(f"Error processing {pdf_file.name}: {e}")

    print(f"\n🎉 Successfully imported all PDFs to Cloud Neon DB! Total chunks: {total_chunks}")

if __name__ == "__main__":
    ingest_to_neon()
