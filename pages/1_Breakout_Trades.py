import streamlit as st
from journal_core import render_category_page, CATEGORY_BREAKOUT

st.set_page_config(page_title="Breakout Trades Journal", layout="wide")

render_category_page(CATEGORY_BREAKOUT)
