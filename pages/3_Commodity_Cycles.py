import streamlit as st
from journal_core import render_category_page, CATEGORY_COMMODITY

st.set_page_config(page_title="Commodity Cycles Journal", layout="wide")

render_category_page(CATEGORY_COMMODITY)
