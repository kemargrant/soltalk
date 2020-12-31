import React from 'react';

function TransactionHistory(props){	
	let transactions = localStorage.getItem("transactionHistory")? JSON.parse(localStorage.getItem("transactionHistory")) : [];
	return(<div className="txHistory">
		<ul>
			{
				transactions && transactions.reverse().map((transaction,ind)=>(
					<li key={ind}>
						<p>
						{ props.timeAgo.format(new Date(transaction.date)) }
						<br/>
						{transaction.type}
						<br/>
							<a rel="noopener noreferrer" 
							href={transaction.link} 
							target="_blank">
								{transaction.txid}
							</a>  
						</p> 
					</li>
				))
			}
		</ul>	
	</div>)
}

export {TransactionHistory}
