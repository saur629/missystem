const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function hash(plain) {
  try { return await require('bcryptjs').hash(plain, 10) }
  catch { return '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' }
}

async function main() {
  console.log('\n🌱 Seeding PrintFlow MIS v2...\n')

  // USERS
  await prisma.user.upsert({ where:{username:'admin'}, update:{password:await hash('admin123')}, create:{name:'Rajesh Kumar',username:'admin',password:await hash('admin123'),role:'SUPER_ADMIN',mobile:'9876500000',active:true}})
  await prisma.user.upsert({ where:{username:'priya'}, update:{}, create:{name:'Priya Sharma',username:'priya',password:await hash('priya123'),role:'ADMIN',mobile:'9876500001',active:true}})
  await prisma.user.upsert({ where:{username:'reception'}, update:{}, create:{name:'Anita Gupta',username:'reception',password:await hash('reception123'),role:'RECEPTION',mobile:'9876500002',active:true}})
  await prisma.user.upsert({ where:{username:'designer'}, update:{}, create:{name:'Rahul Sharma',username:'designer',password:await hash('designer123'),role:'DESIGNER',mobile:'9876500003',active:true}})
  await prisma.user.upsert({ where:{username:'printing'}, update:{}, create:{name:'Suresh Singh',username:'printing',password:await hash('printing123'),role:'PRINTING',mobile:'9876500004',active:true}})
  await prisma.user.upsert({ where:{username:'production'}, update:{}, create:{name:'Manoj Verma',username:'production',password:await hash('production123'),role:'PRODUCTION',mobile:'9876500005',active:true}})
  console.log('✔ Users created')

  // CUSTOMERS
  const c1 = await prisma.customer.upsert({ where:{code:'CLT0001'}, update:{}, create:{code:'CLT0001',name:'ABC Corp',mobile:'9876510001',email:'abc@corp.com',city:'Lucknow',gstNo:'09ABCDE1234F1Z5',creditLimit:50000}})
  const c2 = await prisma.customer.upsert({ where:{code:'CLT0002'}, update:{}, create:{code:'CLT0002',name:'City Hospital',mobile:'9876510002',city:'Lucknow',creditLimit:80000}})
  const c3 = await prisma.customer.upsert({ where:{code:'CLT0003'}, update:{}, create:{code:'CLT0003',name:'Daily Star Press',mobile:'9876510003',city:'Lucknow',creditLimit:150000}})
  const c4 = await prisma.customer.upsert({ where:{code:'CLT0004'}, update:{}, create:{code:'CLT0004',name:'Sharma Traders',mobile:'9876510004',city:'Lucknow',creditLimit:30000}})
  const c5 = await prisma.customer.upsert({ where:{code:'CLT0005'}, update:{}, create:{code:'CLT0005',name:'PQR Events',mobile:'9876510005',city:'Kanpur',creditLimit:40000}})
  console.log('✔ Customers created')

  // SUPPLIERS
  await prisma.supplier.upsert({ where:{code:'SUP001'}, update:{}, create:{code:'SUP001',name:'Star Papers Pvt Ltd',contact:'9876600001',gstNo:'09STAR1234S1Z2',items:'Paper, Boards'}})
  await prisma.supplier.upsert({ where:{code:'SUP002'}, update:{}, create:{code:'SUP002',name:'Ink World',contact:'9876600002',gstNo:'09INKW5678I2Z5',items:'CMYK Inks'}})
  await prisma.supplier.upsert({ where:{code:'SUP003'}, update:{}, create:{code:'SUP003',name:'Flex Suppliers',contact:'9876600003',items:'Flex, Vinyl, Star Flex'}})
  console.log('✔ Suppliers created')

  // STOCK ITEMS
  const stockCount = await prisma.stockItem.count()
  if (stockCount === 0) {
    await prisma.stockItem.createMany({ data: [
      {name:'Star Flex',category:'Flex Media',unit:'SQ FT',hsnCode:'39206990',gstPct:18,saleRate:35,stock:2400,minStock:500},
      {name:'Black Back Flex',category:'Flex Media',unit:'SQ FT',hsnCode:'39206990',gstPct:18,saleRate:30,stock:1800,minStock:500},
      {name:'One Way Vision',category:'Flex Media',unit:'SQ FT',hsnCode:'39206990',gstPct:18,saleRate:55,stock:600,minStock:200},
      {name:'Maplitho Paper A4 70GSM',category:'Paper',unit:'KG',hsnCode:'48025590',gstPct:18,saleRate:62,stock:480,minStock:100},
      {name:'Art Paper 130 GSM',category:'Paper',unit:'KG',hsnCode:'48109900',gstPct:18,saleRate:78,stock:120,minStock:50},
      {name:'Offset Ink CMYK Set',category:'Ink',unit:'KG',hsnCode:'32081010',gstPct:18,saleRate:850,stock:4,minStock:10},
      {name:'Lamination Film Matt',category:'Lamination',unit:'ROLL',hsnCode:'39201090',gstPct:18,saleRate:2200,stock:3,minStock:5},
    ]})
  }
  console.log('✔ Stock items created')

  // SAMPLE ORDERS
  const orderCount = await prisma.order.count()
  if (orderCount === 0) {
    const admin = await prisma.user.findFirst({ where:{ username:'admin' }})
    const orders = [
      { orderNo:'ORD-2025-0001', customerId:c1.id, orderType:'FLEX', width:10, height:4, sqFt:40, ratePerSqFt:85, flexMedia:'Star Flex', subTotal:3400, gstPct:18, gstAmount:612, totalAmount:4012, advancePaid:2000, balanceDue:2012, status:'PRINTING', priority:'NORMAL', dueDate:new Date('2025-04-10'), operatorId:admin?.id },
      { orderNo:'ORD-2025-0002', customerId:c2.id, orderType:'OFFSET', jobName:'Brochure', qty:2000, paperType:'Art Paper', paperGsm:'130 GSM', size:'A4', colors:'4-color (CMYK)', printSide:'DOUBLE', lamination:'Matt Lamination', subTotal:22000, gstPct:18, gstAmount:3960, totalAmount:25960, advancePaid:10000, balanceDue:15960, status:'PENDING', priority:'URGENT', dueDate:new Date('2025-04-05'), operatorId:admin?.id },
      { orderNo:'ORD-2025-0003', customerId:c3.id, orderType:'DIGITAL', jobName:'Visiting Cards', qty:500, paperType:'Art Paper', paperGsm:'300 GSM', size:'3.5x2 inch', colors:'4-color (CMYK)', printSide:'DOUBLE', lamination:'Glossy Lamination', subTotal:3000, gstPct:18, gstAmount:540, totalAmount:3540, advancePaid:3540, balanceDue:0, status:'DELIVERED', priority:'NORMAL', dueDate:new Date('2025-04-02'), deliveredAt:new Date(), operatorId:admin?.id },
      { orderNo:'ORD-2025-0004', customerId:c4.id, orderType:'FLEX', width:6, height:3, sqFt:18, ratePerSqFt:90, flexMedia:'Black Back', subTotal:1620, gstPct:18, gstAmount:291.6, totalAmount:1911.6, advancePaid:1000, balanceDue:911.6, status:'DESIGN_DONE', priority:'EXPRESS', dueDate:new Date('2025-04-04'), operatorId:admin?.id },
      { orderNo:'ORD-2025-0005', customerId:c5.id, orderType:'SCREEN', jobName:'T-Shirt Print', qty:100, colors:'2-color', description:'White T-shirts, front and back print', subTotal:8000, gstPct:18, gstAmount:1440, totalAmount:9440, advancePaid:5000, balanceDue:4440, status:'READY', priority:'NORMAL', dueDate:new Date('2025-04-08'), operatorId:admin?.id },
    ]
    for (const o of orders) {
      const order = await prisma.order.create({ data: o })
      await prisma.statusLog.create({ data:{ orderId:order.id, status:o.status, notes:'Sample order', userId:admin?.id }})
    }
    console.log('✔ Sample orders created')
  }

  // SAMPLE INVOICE
  const invCount = await prisma.invoice.count()
  if (invCount === 0) {
    const inv = await prisma.invoice.create({
      data: { invNo:'INV-0001', customerId:c1.id, dueDate:new Date('2025-04-30'), subTotal:3400, gstAmount:612, totalAmount:4012, paidAmount:4012, status:'PAID',
        items:{ create:[{ description:'Flex Banner 10×4 ft Star Flex', qty:1, rate:4012, amount:4012, gstPct:18, gstAmount:612, totalAmount:4012 }]}
      }
    })
    await prisma.payment.create({ data:{ receiptNo:'REC-0001', customerId:c1.id, invoiceId:inv.id, amount:4012, mode:'UPI', reference:'UPI-TXN001' }})
  }

  // SAMPLE QUOTATION
  const qtCount = await prisma.quotation.count()
  if (qtCount === 0) {
    await prisma.quotation.create({
      data:{ qtNo:'QT-2025-0001', customerId:c2.id, description:'Brochure A4 4-color Matt Lam', qty:2000, rate:11, subTotal:22000, gstPct:18, gstAmount:3960, totalAmount:25960, validTill:new Date('2025-04-15'), status:'PENDING' }
    })
  }

  // SMS TEMPLATES
  const smsCount = await prisma.smsTemplate.count()
  if (smsCount === 0) {
    await prisma.smsTemplate.createMany({ data:[
      { name:'Order Received', content:'Dear {name}, your order {orderNo} has been received. We will update you on progress. - PrintFlow', trigger:'PENDING', isAuto:true },
      { name:'Design Ready', content:'Dear {name}, design for order {orderNo} is completed. Proceeding to print. - PrintFlow', trigger:'DESIGN_DONE', isAuto:true },
      { name:'Order Ready', content:'Dear {name}, your order {orderNo} is ready for pickup! Contact: {phone}. - PrintFlow', trigger:'READY', isAuto:true },
      { name:'Payment Reminder', content:'Dear {name}, invoice {invNo} of Rs.{amount} is due. Please make payment. - PrintFlow', isAuto:false },
      { name:'Order Delivered', content:'Dear {name}, your order {orderNo} has been delivered. Thank you for your business! - PrintFlow', trigger:'DELIVERED', isAuto:true },
    ]})
  }

  // ATTENDANCE TODAY
  const allUsers = await prisma.user.findMany({ take:6 })
  const today = new Date(); today.setHours(0,0,0,0)
  for (const u of allUsers) {
    await prisma.attendance.upsert({
      where:{ userId_date:{ userId:u.id, date:today }},
      update:{},
      create:{ userId:u.id, date:today, checkIn:'09:00', status:'PRESENT' }
    })
  }

  console.log('\n========================================')
  console.log('  ✅ SEED COMPLETE!')
  console.log('  Login Credentials:')
  console.log('  Super Admin  : admin      / admin123')
  console.log('  Admin        : priya      / priya123')
  console.log('  Reception    : reception  / reception123')
  console.log('  Designer     : designer   / designer123')
  console.log('  Printing     : printing   / printing123')
  console.log('  Production   : production / production123')
  console.log('========================================\n')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
