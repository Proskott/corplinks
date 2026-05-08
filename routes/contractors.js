// 1. Отримання списку
async function loadContractors() {
    const res = await fetch('/api/contractors');
    const contractors = await res.json();
    
    const tableBody = document.getElementById('contractors-table-body');
    tableBody.innerHTML = '';
    
    contractors.forEach(c => {
        tableBody.innerHTML += `
            <tr>
                <td>${c.company}</td>
                <td>${c.contact}</td>
                <td>${c.phone}</td>
                <td><button onclick="deleteContractor(${c.id})">Видалити</button></td>
            </tr>`;
    });
}

// 2. Відправка в хмару
async function addContractor() {
    const data = {
        company: document.getElementById('comp-name').value,
        contact: document.getElementById('comp-person').value,
        phone: document.getElementById('comp-phone').value
    };

    await fetch('/api/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    loadContractors(); // Оновлюємо у всіх
}