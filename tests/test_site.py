from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import unittest

ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.links = []
        self.resources = []
    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'a':
            self.links.append(attrs)
        if tag in ('link', 'script', 'img'):
            self.resources.append(attrs.get('src') or attrs.get('href'))

class SiteTests(unittest.TestCase):
    def setUp(self):
        self.page = Page()
        self.page.feed((ROOT / 'index.html').read_text())
    def test_anchors_and_unique_ids(self):
        self.assertEqual(len(self.page.ids), len(set(self.page.ids)))
        for link in self.page.links:
            href = link.get('href', '')
            if href.startswith('#'):
                self.assertIn(href[1:], self.page.ids)
    def test_contact_and_project_links(self):
        urls = [a.get('href', '') for a in self.page.links]
        self.assertIn('mailto:fxcasio998@gmail.com', urls)
        for project in ('PoseCare-Demo', 'T2-Education'):
            self.assertIn('https://github.com/Hypertension42/' + project, urls)
        for a in self.page.links:
            if a.get('target') == '_blank':
                self.assertIn('noopener', a.get('rel', ''))
    def test_identity_is_personal_not_a_cooperation_title(self):
        html = (ROOT / 'index.html').read_text()
        hero = html.split('<section class="hero"', 1)[1].split('</section>', 1)[0]
        self.assertIn('陈振邦', hero)
        self.assertIn('AI Agent 与应用开发', hero)
        self.assertNotIn('纵横家', hero)
        self.assertNotIn('STRATEGIST', html)
        self.assertIn('“纵横家”是我给自己的一个提醒', html)
    def test_static_resources_are_local_and_exist(self):
        for resource in self.page.resources:
            if resource:
                self.assertFalse(resource.startswith(('http:', 'https:', '//')))
                self.assertTrue((ROOT / urlsplit(resource).path).is_file(), resource)
        self.assertTrue((ROOT / '.nojekyll').is_file())
        self.assertFalse((ROOT / 'assets/vendor').exists(), 'No 3D dependencies')
    def test_motion_controls_and_accessible_title(self):
        html = (ROOT / 'index.html').read_text()
        for control in ('motion-toggle', 'replay-intro'):
            self.assertIn(control, self.page.ids)
        self.assertEqual(html.count('class="glyph-reel"'), 4)
        self.assertIn('<h1 id="hero-title">陈振邦', html)
        self.assertIn('class="wave-field" aria-hidden="true"', html)
    def test_entry_is_optional_without_javascript(self):
        html = (ROOT / 'index.html').read_text()
        self.assertIn('<dialog class="entry-gate" id="entry-gate" aria-labelledby="entry-title" hidden>', html)
        for control in ('entry-enter', 'entry-skip', 'site-content'):
            self.assertIn(control, self.page.ids)
        self.assertEqual(html.count('class="gate-panel gate-panel-'), 4)
        self.assertNotIn('id="site-content" inert', html)
    def test_project_controls_and_facts(self):
        html = (ROOT / 'index.html').read_text()
        for project in ('qizhu', 'keybank', 'posecare', 'education', 'wuhan'):
            self.assertIn('tab-' + project, self.page.ids)
            self.assertIn('panel-' + project, self.page.ids)
            self.assertIn('detail-' + project, self.page.ids)
        self.assertIn('缺席字段检出准确率', html)
        self.assertIn('团队系统覆盖', html)
        self.assertIn('436', html)
        self.assertIn('尚未完成融资', html)
        self.assertNotIn('<canvas', html)


if __name__ == '__main__':
    unittest.main()
