function getCookieValue(name){
    return document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')?.pop() || '';
}

function getInitials(name){
    const words = name.trim().split(' ');
    let initials = '';
    for (const word of words) {
        if (word) {
        initials += word[0].toUpperCase();
        }
    }
    return initials;
}

function convertIsoTimestampToReadableText(date) {
    const day = date.getUTCDate().toString().padStart(2, '0');
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const month = monthNames[date.getUTCMonth()];
    const year = date.getUTCFullYear();

    let hour = date.getUTCHours();
    const minute = date.getUTCMinutes().toString().padStart(2, '0');
    const period = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour === 0 ? 12 : hour; // Handle 12 AM/PM
    hour = hour.toString().padStart(2, '0')

    const formattedTime = `${dollar}{hour}:${dollar}{minute} ${dollar}{period}`;
    const formattedDate = `${dollar}{day} ${dollar}{month} ${dollar}{year}`;

    return `${dollar}{formattedDate} ${dollar}{formattedTime}`;
}
