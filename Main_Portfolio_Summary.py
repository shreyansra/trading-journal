import streamlit as st

from journal_core import (
    load_data,
    compute_portfolio_summary,
)

st.set_page_config(page_title="Portfolio Summary", layout="wide")

st.title("📊 Portfolio Summary")

df = load_data()

if df.empty or df["entry_date"].dropna().empty:
    st.info("No trades recorded yet. Go to one of the strategy pages to start journaling trades.")
else:
    st.markdown("### Yearly & category breakdown")

    by_cat_year_df, by_year_df, overall = compute_portfolio_summary(df)

    if by_cat_year_df.empty and by_year_df.empty:
        st.info("No closed trades with PnL yet to summarize.")
    else:
        if not by_cat_year_df.empty:
            st.subheader("By year & category")
            st.dataframe(by_cat_year_df, use_container_width=True)

        if not by_year_df.empty:
            st.subheader("By year (all categories)")
            st.dataframe(by_year_df, use_container_width=True)

        if overall:
            st.subheader("Overall portfolio metrics")
            col1, col2, col3, col4 = st.columns(4)
            col1.metric("Total PnL", f"{overall['Total PnL']:.2f}")
            col2.metric("Trade groups", f"{overall['Trade Groups']}")
            col3.metric("Win rate", f"{overall['Win Rate'] * 100:.1f}%")
            col4.metric("Total legs", f"{overall['Total Legs']}")
            st.caption("Metrics are based on closed trade groups with a calculated PnL.")

st.markdown("---")
st.markdown("Use the sidebar **Pages** navigation to switch to:")
st.markdown("- **Breakout Trades**")
st.markdown("- **Equity Index Tracking**")
st.markdown("- **Commodity Cycles**")
st.markdown("- **Income**")
