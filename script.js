window.addEventListener('load', function() {
  // Attendre que la page soit complètement chargée
  setTimeout(function() {
    document.body.classList.add('transitions-enabled');
  }, 100);
});
// Onglets
const tabs=document.querySelectorAll('.tabs button');
const contents=document.querySelectorAll('.tab-content');
tabs.forEach(btn=>{
  btn.addEventListener('click',()=>{
    tabs.forEach(b=>b.classList.remove('active'));
    contents.forEach(c=>c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.id.replace("tab-","")).classList.add('active');
  })
});

// === Formatage texte/math ===
const latexCmds=["\\frac","\\hline","\\begin","\\end","\\sqrt","\\text","\\mathrm"];

function formatToken(token){
  // "à" ou mot >1 lettre -> texte
  if(token.toLowerCase() === "à" || token.toLowerCase() === "a" || token.length > 1) return "\\text{ "+token+" }";
  // une seule lettre -> math
  if(/^[a-zA-Z]$/.test(token)) return token;
  // LaTeX command ou chiffres/symboles
  if(token.startsWith("\\") || /^[0-9=+\-*/^_{}()[\]]+$/.test(token)) return token;
  return "\\text{ "+token+" }";
}

function formatLineGrouped(line){
  if(/\\begin\{(array|aligned)\}/.test(line)) return "& " + line;

  const tokens = line.split(/(\\[a-zA-Z]+|{[^}]*}|[0-9]+|[=+\-*/^_{}()[\]]|\s+|[,.:;!?])/);
  let result = "";
  let buffer = [];

  function flushBuffer(){
    if(buffer.length){
      let phrase = buffer.join("").trim();
      if(phrase) result += "\\text{ " + phrase + " } ";
      buffer = [];
    }
  }

  function isWord(str){
    return (str.toLowerCase() === "à") || (/^[a-zA-ZÀ-ÖØ-öø-ÿ]{2,}$/.test(str));
  }



  tokens.forEach((t,i)=>{
    if(!t || /^\s+$/.test(t)){
      if(buffer.length) buffer.push(" ");
    } 
else if(/^[,.:;!?]$/.test(t)){
  // Chercher les vrais voisins non vides (ignorer espaces)
  let k = i - 1;
  let prev = "";
  while(k >= 0 && /^\s*$/.test(tokens[k])) k--;
  if(k >= 0) prev = tokens[k].trim();

  k = i + 1;
  let next = "";
  while(k < tokens.length && /^\s*$/.test(tokens[k])) k++;
  if(k < tokens.length) next = tokens[k].trim();

  if(isWord(prev) && isWord(next)){
    buffer.push(t);
  } else {
    flushBuffer();
    result += t + " ";
  }
}
    // Dans le traitement des tokens
else if (/^[A-Z]{2,}$/.test(t)) {
  // Si c'est une séquence de lettres majuscules, c'est probablement des variables mathématiques
  flushBuffer();
  result += t.split('').join(' ') + " "; // "AB" -> "A B"
} 

else if(/^\\[a-zA-Z]+$/.test(t)){
  flushBuffer();
  // vérifier si le prochain token est {…}
  let next = tokens[i+1] || "";
  if(/^({[^}]*})$/.test(next)){
    result += t + next + " "; // concaténer commande + argument
    i++; // sauter l’argument
  } else {
    result += t + " ";
  }
}

    else if(/^[0-9=+\-*/^_{}()[\]]+$/.test(t)){
      flushBuffer();
      result += t + " "; // nombres et symboles mathématiques
    } 
    else if(isWord(t)){
      buffer.push(t); // mots normaux
    } 
    else {
      flushBuffer();
      result += t + " "; // variables simples (une lettre)
    }
  });

  flushBuffer();
  return result.trim();
}
function runTests() {
  const cases = [
    { input: "avoir moins", expected: "\\text{ avoir moins }" },
    { input: "avoir, moins", expected: "\\text{ avoir, moins }" },
    { input: "a + b", expected: "a + b" },
    { input: "à moins", expected: "\\text{ à moins }" },
    { input: "2,5", expected: "2,5" },
    { input: "x \\times y", expected: "x \\times y" },
    { input: "\\overrightarrow{AB}", expected: "\\overrightarrow{AB}" },
    { input: "a, moins", expected: "a, \\text{ moins }" }, // mixte
  ];

  console.log("=== Tests formatLineGrouped ===");
  let ok = 0;
  cases.forEach(({ input, expected }, i) => {
    let out = formatLineGrouped(input);
    let pass = out === expected;
    console.log(`${i+1}. "${input}" → ${out} ${pass ? "✅" : `❌ (attendu: ${expected})`}`);
    if(pass) ok++;
  });
  console.log(`Résultat : ${ok}/${cases.length} tests réussis`);
}

// Lancer les tests
runTests();

// ================= Éditeur ====================
const table=document.getElementById("editorTable");
const rowsInput=document.getElementById("rows");
const colsInput=document.getElementById("cols");
const bordersInput=document.getElementById("borders");
const alignControls=document.getElementById("alignControls");
const latexBox=document.getElementById("latexCode");
const latexRender=document.getElementById("latexRender");
let alignments=[];

function buildTable(){
  table.innerHTML=""; alignControls.innerHTML="";
  let rows=parseInt(rowsInput.value), cols=parseInt(colsInput.value);
  alignments=Array(cols).fill("c");
  for(let i=0;i<cols;i++){
    let select=document.createElement("select");
    ["l","c","r"].forEach(opt=>{
      let o=document.createElement("option"); o.value=opt; o.textContent=opt.toUpperCase();
      if(opt==="c") o.selected=true;
      select.appendChild(o);
    });
    select.addEventListener("change",()=>{ alignments[i]=select.value; updateAlignments(); generateLatex(); });
    alignControls.appendChild(select);
  }
  for(let i=0;i<rows;i++){
    let tr=table.insertRow();
    for(let j=0;j<cols;j++){
      let cell=tr.insertCell(); 
      cell.contentEditable="true"; 
      cell.innerText=`  `;
      cell.addEventListener("input", generateLatex);
      cell.addEventListener("focus", ()=>{ document.execCommand('selectAll',false,null); });
      cell.addEventListener("keydown",(e)=>{
        if(e.key==="Tab"){ e.preventDefault(); 
          const row=cell.parentElement.rowIndex; 
          const col=cell.cellIndex; 
          let nextCol=col+1; 
          let nextRow=row; 
          if(nextCol>=cols){ nextCol=0; nextRow++; } 
          if(nextRow<rows){ table.rows[nextRow].cells[nextCol].focus(); } 
        }
      });
    }
  }
  updateAlignments(); generateLatex();
}

function updateAlignments(){
  for(let r of table.rows){
    for(let j=0;j<r.cells.length;j++){
      r.cells[j].style.textAlign=alignments[j]==="l"?"left":alignments[j]==="r"?"right":"center";
    }
  }
}

function generateLatex(){
  const rows=table.rows; if(rows.length===0) return;
  const useBorders=bordersInput.checked;
  let latex = useBorders ? "\\begin{array}{|" + alignments.map(a=>a+"|").join("")+"} \\hline\n"
                         : "\\begin{array}{" + alignments.join("") + "}\n";
  for(let i=0;i<rows.length;i++){
    let cells=[];
    for(let j=0;j<rows[i].cells.length;j++){
      let content=formatLineGrouped(rows[i].cells[j].innerText.trim());
      cells.push(content);
    }
    latex+=cells.join(" & ") + " \\\\"; 
    if(useBorders) latex+=" \\hline";
    latex+="\n";
  }
  latex+="\\end{array}";
  latexBox.innerText="\n$\n"+latex+"\n$";
  try{ katex.render(latex, latexRender, {throwOnError:false}); } catch(e){ latexRender.innerHTML="<span style='color:red'>Erreur</span>"; }
}

function resetTable(){ buildTable(); }

// ================= Assembleur =================
const assemblerInput=document.getElementById("assemblerInput");
const assemblerCode=document.getElementById("assemblerCode");
const assemblerRender=document.getElementById("assemblerRender");
const arrayCode=document.getElementById("arrayCode");
const arrayRender=document.getElementById("arrayRender");

function assemble(){
  let raw=assemblerInput.value.replace(/\$/g,"").trim();
  if(!raw) { 
    assemblerCode.innerHTML="";
    assemblerRender.innerHTML="";
    arrayCode.innerHTML="";
    arrayRender.innerHTML="";
    return; 
  }
  
  let lines=raw.split(/\n/).map(l=>l.trim()).filter(l=>l!=="");

  // --- Aligned ---
  let aligned="\n$\n\\begin{aligned}\n";
  lines.forEach(line=>{
    if(/\\begin\{.*?\}/.test(line)){ 
      aligned+=" & "+line+"\n";
    } else { 
      aligned+=" & "+formatLineGrouped(line)+" \\\\\n"; 
    }
  });
  aligned+="\\end{aligned}\n$";
  assemblerCode.innerHTML=aligned;
  try{ katex.render(aligned.replace(/\$/g,""), assemblerRender, {throwOnError:false}); } catch(e){ assemblerRender.innerHTML="<span style='color:red'>Erreur</span>"; }

  // --- Array ---
  let arr="$\\begin{array}{c}\n";
  lines.forEach(line=>{
    if(/\\begin\{array\}/.test(line)){ 
      arr+=" & "+line+"\n";
    } else { 
      arr+=formatLineGrouped(line)+" \\\\\n"; 
    }
  });
  arr+="\\end{array}$";
  arrayCode.innerHTML=arr;
  try{ katex.render(arr.replace(/\$/g,""), arrayRender, {throwOnError:false}); } catch(e){ arrayRender.innerHTML="<span style='color:red'>Erreur</span>"; }
}

assemblerInput.addEventListener("input", assemble);
function copyCode(id){ navigator.clipboard.writeText(document.getElementById(id).innerText); }
function clearAssembler(){ assemblerInput.value=""; assemblerCode.innerHTML=""; assemblerRender.innerHTML=""; arrayCode.innerHTML=""; arrayRender.innerHTML=""; }

rowsInput.addEventListener("input",buildTable);
colsInput.addEventListener("input",buildTable);
bordersInput.addEventListener("change",generateLatex);


buildTable();

 
// document.querySelector(".cut-btn").addEventListener("click", async () => {
//   const textcode = document.getElementById("assemblerCode");
//   const text = textcode.innerText;
//   if (!text.trim()) return;

//   await navigator.clipboard.writeText(text); // copie
//   assemblerInput.value ="";                      // supprime (effet couper)
//    assemblerCode.innerText = "";
//     assemblerRender.innerHTML="";
//     arrayCode.innerHTML="";
//     arrayRender.innerHTML="";
// });


document.querySelectorAll(".cut-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    // Trouver seulement le conteneur de code
    const codeContainer = btn.closest(".code-container");
    if (!codeContainer) return;
    
    // Chercher uniquement l'élément <code> dans ce conteneur
    const codeElement = codeContainer.querySelector("code");
    if (!codeElement) return;
    
    const text = codeElement.innerText.trim();
    if (!text) return;
    
    try {
      await navigator.clipboard.writeText(text);
      
      // Feedback visuel
      const originalText = btn.textContent;
      btn.textContent = "✓ Copié!";
      btn.style.background = "linear-gradient(135deg, #4CAF50, #2E7D32)";
      
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = "";
      }, 1500);
      
      // Effacer UNIQUEMENT ce code
      codeElement.innerText = "";
      
    } catch (err) {
      console.error("Erreur:", err);
      // Fallback simple
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    // EFFACER TOUT dans l'onglet parent
    const tabContent = btn.closest(".tab-content");
    if (tabContent) {
      if (tabContent.id === "editor") {
        // Éditeur - effacer tout
        document.getElementById("latexCode").innerText = "";
        document.getElementById("latexRender").innerHTML = "";
        
        // Effacer aussi les cellules du tableau
        const tableCells = document.querySelectorAll("#editorTable td input");
        tableCells.forEach(cell => {
          cell.value = "";
        });
      } 
      else if (tabContent.id === "assembler") {
        // Assembleur - effacer TOUT
        document.getElementById("assemblerInput").value = "";
        document.getElementById("assemblerCode").innerText = "";
        document.getElementById("assemblerRender").innerHTML = "";
        document.getElementById("arrayCode").innerText = "";
        document.getElementById("arrayRender").innerHTML = "";
      }
    }
    
    // Effacer aussi UNIQUEMENT ce code (pour être sûr)
    codeElement.innerText = "";
  });
});



























