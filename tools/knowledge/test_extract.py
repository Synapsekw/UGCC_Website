from extract import extract_page_text

SAMPLE = """
<html><head><style>.x{color:red}</style><script>var a=1</script></head>
<body>
  <header class="header"><nav><a href="/">Home</a><a href="/careers">Careers</a></nav></header>
  <main>
    <h1>Duqm Commercial Berth</h1>
    <p>UGCC delivered infrastructure works for the commercial berth at Duqm Port, Oman.</p>
  </main>
  <footer class="footer">© UGCC. Kuwait. All rights reserved.</footer>
</body></html>
"""


def test_extracts_main_content():
    out = extract_page_text(SAMPLE)
    assert "Duqm Commercial Berth" in out
    assert "commercial berth at Duqm Port" in out


def test_strips_chrome_and_code():
    out = extract_page_text(SAMPLE)
    assert "Home" not in out            # nav stripped
    assert "All rights reserved" not in out  # footer stripped
    assert "var a=1" not in out         # script stripped
    assert "color:red" not in out       # style stripped


def test_collapses_whitespace():
    out = extract_page_text("<main>  a\n\n   b   </main>")
    assert "a b" in out
    assert "\n\n" not in out
