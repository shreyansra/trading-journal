import streamlit as st
from journal_core import render_category_page, CATEGORY_INCOME

st.set_page_config(page_title="Income Journal", layout="wide")

render_category_page(CATEGORY_INCOME)
