# Integração com o fluxo Antigravity

Antes de iniciar a revisão do Prólogo:

1. copie esta pasta para:
   `.agents/skills/kallistis-human-prose/`
2. leia:
   `.agents/skills/kallistis-human-prose/SKILL.md`
3. acrescente ao `chapter_status.json`:
   - `voz_autoral_aprovada`
4. para cada capítulo:
   - extraia texto para análise;
   - revise diretamente no DOCX;
   - execute `style_lint.py`;
   - execute `compare_style_metrics.py`;
   - faça a dupla leitura Autor/Editor;
   - compare cânone e mecânica;
   - renderize as páginas alteradas;
   - só então marque `voz_autoral_aprovada`.

A Skill `kallistis-human-prose` complementa a Skill de produção do livro. Ela não substitui a auditoria mecânica.
