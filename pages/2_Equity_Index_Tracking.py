import streamlit as st
from journal_core import render_category_page, CATEGORY_EQUITY_INDEX

st.set_page_config(page_title="Equity Index Tracking Journal", layout="wide")

render_category_page(CATEGORY_EQUITY_INDEX)
