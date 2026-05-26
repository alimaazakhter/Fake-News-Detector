import os
import sys
import json
import re
import urllib.request
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score

# Configuration
FAKE_DATA_URL = "https://raw.githubusercontent.com/laxmimerit/fake-real-news-dataset/main/data/Fake.csv"
TRUE_DATA_URL = "https://raw.githubusercontent.com/laxmimerit/fake-real-news-dataset/main/data/True.csv"
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
OUTPUT_JSON_PATH = os.path.join(os.path.dirname(__file__), "../public/model_metadata.json")

def download_file(url, filename):
    os.makedirs(DATA_DIR, exist_ok=True)
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath):
        print(f"File {filename} already exists. Skipping download.")
        return filepath
    
    print(f"Downloading {url} ...")
    try:
        # Download with simple progress reporting
        def reporthook(blocknum, blocksize, totalsize):
            readsofar = blocknum * blocksize
            if totalsize > 0:
                percent = readsofar * 1e2 / totalsize
                s = f"\rProgress: {percent:5.1f}% ({readsofar}/{totalsize} bytes)"
                sys.stdout.write(s)
                sys.stdout.flush()
            else:
                sys.stdout.write(f"\rRead {readsofar} bytes")
        urllib.request.urlretrieve(url, filepath, reporthook)
        print("\nDownload complete.")
    except Exception as e:
        print(f"\nFailed to download {url}: {e}")
        # Try a smaller fallback dataset if these links fail
        raise e
    return filepath

def clean_text(text):
    if not isinstance(text, str):
        return ""
    # Strip Reuters location/agency prefix at the beginning of the text (e.g. "WASHINGTON (Reuters) -")
    text = re.sub(r'^[a-zA-Z\s]+ \((reuters|reuters agency)\)\s*-\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^[a-zA-Z\s]+ \(reuters\)\s*-\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^reuters\s*-\s*', '', text, flags=re.IGNORECASE)
    
    text = text.lower()
    text = re.sub(r'\[.*?\]', '', text)
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    text = re.sub(r'<.*?>+', '', text)
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def main():
    print("Step 1: Downloading datasets...")
    try:
        fake_path = download_file(FAKE_DATA_URL, "Fake.csv")
        true_path = download_file(TRUE_DATA_URL, "True.csv")
    except Exception as e:
        print("Error downloading main datasets. Using a smaller backup dataset structure.")
        # fallback to a smaller dataset or exit
        sys.exit(1)

    print("\nStep 2: Loading datasets...")
    fake_df = pd.read_csv(fake_path)
    true_df = pd.read_csv(true_path)

    # Balance datasets and sample to make training faster if needed
    # We'll take up to 15,000 rows from each to keep things fast and fit in memory/JSON size constraints
    sample_size = min(15000, len(fake_df), len(true_df))
    fake_df = fake_df.sample(n=sample_size, random_state=42)
    true_df = true_df.sample(n=sample_size, random_state=42)

    fake_df['label'] = 0  # 0 = FAKE
    true_df['label'] = 1  # 1 = REAL

    df = pd.concat([fake_df, true_df], ignore_index=True)
    df = df[['text', 'label']].dropna()
    df.drop_duplicates(inplace=True)
    df.reset_index(drop=True, inplace=True)

    print(f"Dataset shape after balancing and cleaning: {df.shape}")

    print("Step 3: Cleaning text...")
    df['clean_text'] = df['text'].apply(clean_text)

    X = df['clean_text']
    y = df['label']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("Step 4: Vectorizing text with TF-IDF...")
    # Add custom stop words to prevent database shortcut learning (debiasing the model)
    custom_stop_words = [
        'reuters', 'said', 'tuesday', 'wednesday', 'thursday', 'friday', 
        'monday', 'sunday', 'saturday', 'washington', 'london', 'image', 
        'images', 'photo', 'via', 'featured', 'caption', 'read', 'photo'
    ]
    from sklearn.feature_extraction import text
    stop_words_list = list(text.ENGLISH_STOP_WORDS.union(custom_stop_words))

    # Limit max features to 5000 to keep the model JSON small and fast for client-side loading
    vectorizer = TfidfVectorizer(max_features=5000, stop_words=stop_words_list)
    X_train_vectorized = vectorizer.fit_transform(X_train)
    X_test_vectorized = vectorizer.transform(X_test)

    print("Step 5: Training Logistic Regression Model...")
    model = LogisticRegression(C=1.0, max_iter=1000)
    model.fit(X_train_vectorized, y_train)

    # Evaluate
    predictions = model.predict(X_test_vectorized)
    acc = accuracy_score(y_test, predictions)
    print(f"Model Test Accuracy: {acc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, predictions, target_names=["FAKE", "REAL"]))

    print("Step 6: Exporting model parameters to JSON...")
    # Extract vocabulary, idf weights, model coefficients, and intercept
    vocab = vectorizer.vocabulary_
    idf = vectorizer.idf_.tolist()
    
    # Vocabulary sorted by feature index
    feature_names = vectorizer.get_feature_names_out().tolist()
    coef = model.coef_[0].tolist()
    intercept = float(model.intercept_[0])

    # Construct the JSON model metadata
    model_metadata = {
        "feature_names": feature_names,
        "vocab_indices": {word: idx for idx, word in enumerate(feature_names)},
        "idf": idf,
        "coefficients": coef,
        "intercept": intercept,
        "accuracy": float(acc)
    }

    os.makedirs(os.path.dirname(OUTPUT_JSON_PATH), exist_ok=True)
    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(model_metadata, f, indent=2)

    print(f"Model successfully saved to {OUTPUT_JSON_PATH}")

if __name__ == "__main__":
    main()
