// 1. Завантаження з хмари (викликай цю функцію при відкритті вкладки)
async function loadAccounting() {
    const res = await fetch('/api/accounting');
    const data = await res.json();
    
    const container = document.getElementById('accounting-list'); // перевір ID свого контейнера
    container.innerHTML = ''; // очищуємо старе
    
    data.forEach(item => {
        // Тут твій код створення рядка таблиці чи картки
        container.innerHTML += `<div>${item.title}: ${item.amount} грн</div>`; 
    });
}

// 2. Додавання нового запису
async function saveAccountingEntry(event) {
    event.preventDefault();
    const formData = {
        title: document.getElementById('acc-title').value,
        amount: Number(document.getElementById('acc-amount').value),
        type: document.getElementById('acc-type').value,
        date: new Date().toLocaleDateString()
    };

    const res = await fetch('/api/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    });

    if (res.ok) {
        loadAccounting(); // Перемальовуємо список для всіх
        alert('Збережено в хмарі!');
    }
}